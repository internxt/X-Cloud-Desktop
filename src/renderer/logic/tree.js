import fs from 'fs'
import path from 'path'
import database from '../../database'
import async from 'async'
import crypt from './crypt'
import readdirp from 'readdirp'
import sanitize from 'sanitize-filename'
import Logger from '../../libs/logger'
import Auth from './utils/Auth'
import ConfigStore from '../../main/config-store'

const IgnoredFiles = ['^\\.(DS_Store|[Tt]humbs)$', '.*~$', '^\\._.*', '^~.*']

function getListFromFolder(folderPath) {
  return new Promise(resolve => {
    const results = []
    readdirp(folderPath, {
      type: 'files'
    })
      .on('data', data => {
        if (data.basename !== sanitize(data.basename)) {
          return Logger.info(
            'Ignoring %s, filename not compatible',
            data.fullPath
          )
        }

        const invalid = IgnoredFiles.find(regex =>
          new RegExp(regex).test(data.basename)
        )

        if (typeof invalid === 'undefined') {
          results.push(data.fullPath)
        }
      })
      .on('warn', warn => Logger.error('READDIRP non-fatal error', warn))
      .on('error', err => Logger.error('READDIRP fatal error', err.message))
      .on('end', () => {
        resolve(results)
      })
  })
}

function getStat(filepath) {
  try {
    return fs.lstatSync(filepath)
  } catch (err) {
    return null
  }
}

function _recursiveFolderToList(tree, basePath, currentPath = null) {
  let finalList = []
  return new Promise((resolve, reject) => {
    async.eachSeries(
      tree.children,
      async (item, next) => {
        const decryptedName = crypt.decryptName(item.name, item.parentId)
        const fullNewPath = path.join(currentPath || basePath, decryptedName)
        finalList.push(fullNewPath)
        const subFolder = await _recursiveFolderToList(
          item,
          basePath,
          fullNewPath
        )
        finalList = finalList.concat(subFolder)
        next()
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(finalList)
        }
      }
    )
  })
}

async function getFolderListFromRemoteTree() {
  const tree = await database.Get('tree')
  const basePath = await database.Get('xPath')
  return new Promise((resolve, reject) => {
    _recursiveFolderToList(tree, basePath)
      .then(list => resolve(list))
      .catch(reject)
  })
}

function _recursiveFolderObjectToList(tree, basePath, currentPath = null) {
  let finalList = []
  return new Promise((resolve, reject) => {
    async.eachSeries(
      tree.children,
      async (item, next) => {
        const decryptedName = crypt.decryptName(item.name, item.parentId)
        const fullNewPath = path.join(currentPath || basePath, decryptedName)
        const cloneObject = JSON.parse(JSON.stringify(item))
        delete cloneObject.children
        const finalObject = { key: fullNewPath, value: cloneObject }
        finalList.push(finalObject)
        const subFolder = await _recursiveFolderObjectToList(
          item,
          basePath,
          fullNewPath
        )
        finalList = finalList.concat(subFolder)
        next()
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(finalList)
        }
      }
    )
  })
}

async function getFolderObjectListFromRemoteTree() {
  const tree = await database.Get('tree')
  const basePath = await database.Get('xPath')
  return new Promise((resolve, reject) => {
    _recursiveFolderObjectToList(tree, basePath)
      .then(list => resolve(list))
      .catch(reject)
  })
}

function generatePath(pathDict, item) {
  if (!pathDict[item.parent]) return
  if (pathDict[item.parent].full) {
    return pathDict[item.parent].path
  } else {
    var parentPath = generatePath(pathDict, pathDict[item.parent])
    if (parentPath === undefined) {
      return
    }
    pathDict[item.parent].path = path.join(
      parentPath,
      pathDict[item.parent].path
    )
    pathDict[item.parent].full = true
    return pathDict[item.parent].path
  }
}

async function regenerateLocalDbFolder(tree) {
  const finalDict = {}
  const dbEntrys = []

  const basePath = await database.Get('xPath')
  await database.dbFolders.remove({}, { multi: true })
  for (const item of tree.folders) {
    if (!item.parent_id) {
      finalDict[item.id] = {
        path: basePath,
        parent: item.parent_id,
        full: true
      }
      continue
    }
    finalDict[item.id] = {
      path: crypt.decryptName(item.name, item.parent_id),
      parent: item.parent_id,
      full: false
    }
  }

  for (const item of tree.folders) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    if (!item.parent_id || !finalDict[item.parent_id]) {
      continue
    }
    if (!finalDict[item.id].full) {
      var parentPath = generatePath(finalDict, finalDict[item.id])
      if (parentPath === undefined) {
        delete finalDict[item.id]
        continue
      }
      finalDict[item.id].path = path.join(parentPath, finalDict[item.id].path)
      finalDict[item.id].full = true
    }
    const fullNewPath = finalDict[item.id].path
    const cloneObject = JSON.parse(JSON.stringify(item))
    const finalObject = { key: fullNewPath, value: cloneObject }
    if (path.basename(fullNewPath) !== sanitize(path.basename(fullNewPath))) {
      Logger.info('Ignoring folder %s, invalid name', finalObject.key)
      delete finalDict[item.id]
      continue
    }
    dbEntrys.push(finalObject)
    // return
  }
  await database.dbFolders.insert(dbEntrys)
  return finalDict
}

async function regenerateLocalDbFile(tree, folderDict) {
  const dbEntrys = []

  await database.dbFiles.remove({}, { multi: true })
  for (const item of tree.files) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    if (!folderDict[item.folder_id]) {
      continue
    }
    const filePath = folderDict[item.folder_id].path
    item.filename = crypt.decryptName(item.name, item.folder_id)

    item.fullpath = path.join(
      filePath,
      item.filename + (item.type ? '.' + item.type : '')
    )

    const cloneObject = JSON.parse(JSON.stringify(item))
    const finalObject = { key: item.fullpath, value: cloneObject }
    if (
      path.basename(finalObject.key) !==
      sanitize(path.basename(finalObject.key))
    ) {
      Logger.info('Ignoring file %s, invalid name', finalObject.key)
      continue
    }
    dbEntrys.push(finalObject)
    // return
  }

  await database.dbFiles.insert(dbEntrys)
}

function _recursiveFilesToList(tree, basePath, currentPath = null) {
  let finalList = tree.files

  finalList.forEach(item => {
    const encryptedFileName = item.name
    const salt = item.folder_id
    item.filename = crypt.decryptName(encryptedFileName, salt)
    item.fullpath = path.join(
      currentPath || basePath,
      item.filename + (item.type ? '.' + item.type : '')
    )
  })

  return new Promise((resolve, reject) => {
    async.eachSeries(
      tree.children,
      async (item, next) => {
        const decryptedName = crypt.decryptName(item.name, item.parentId)
        const fullNewPath = path.join(currentPath || basePath, decryptedName)
        const subFolder = await _recursiveFilesToList(
          item,
          basePath,
          fullNewPath
        )
        finalList = finalList.concat(subFolder)
        next()
      },
      (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(finalList)
        }
      }
    )
  })
}

async function getFileListFromRemoteTree() {
  const tree = await database.Get('tree')
  const basePath = await database.Get('xPath')
  return new Promise((resolve, reject) => {
    _recursiveFilesToList(tree, basePath)
      .then(list => resolve(list))
      .catch(reject)
  })
}

function getLocalFolderList(localPath) {
  return new Promise(resolve => {
    const results = []
    readdirp(localPath, {
      type: 'directories'
    })
      .on('data', data => {
        if (data.basename !== sanitize(data.basename)) {
          return Logger.info(
            'Directory %s ignored, name is not compatible',
            data.basename
          )
        }
        results.push(data.fullPath)
      })
      .on('warn', warn => console.error('READDIRP non-fatal error', warn))
      .on('error', err => console.error('READDIRP fatal error', err.message))
      .on('end', () => {
        resolve(results)
      })
  })
}

function getLocalFileList(localPath) {
  return getListFromFolder(localPath)
}

function getTree() {
  return new Promise(async (resolve, reject) => {
    fetch(`${process.env.API_URL}/api/storage/tree`, {
      headers: await Auth.getAuthHeader()
    })
      .then(async res => {
        const text = await res.text()
        try {
          return { res, data: JSON.parse(text) }
        } catch (err) {
          throw new Error(err + ' data: ' + text)
        }
      })
      .then(async res => {
        resolve(res.data)
      })
      .catch(reject)
  })
}

async function updateUserObject() {
  const headers = await Auth.getAuthHeader()
  const lastUser = await database.Get('xUser')
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/user/refresh`, {
      method: 'GET',
      headers: headers
    })
      .then(res => {
        return res.text()
      })
      .then(text => {
        try {
          return { data: JSON.parse(text) }
        } catch (err) {
          throw new Error(err + ' data: ' + text)
        }
      })
      .then(data => {
        if (data.data.user) {
          data.data.user.email = lastUser.user.email
          data.data.user.mnemonic = lastUser.user.mnemonic
          return database.Set('xUser', data.data).then(() => {
            resolve()
          })
        }
        throw Error('no user')
      })
      .catch(reject)
  })
}

async function getList() {
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/desktop/tree`, {
      headers: headers
    })
      .then(res => {
        return res.text()
      })
      .then(text => {
        try {
          return { data: JSON.parse(text) }
        } catch (err) {
          throw new Error(err + ' data: ' + text)
        }
      })
      .then(res => {
        resolve(res.data)
      })
      .catch(reject)
  })
}

function updateLocalDb() {
  return new Promise((resolve, reject) => {
    getList()
      .then(tree => {
        regenerateLocalDbFolder(tree)
          .then(result => {
            regenerateLocalDbFile(tree, result)
              .then(resolve)
              .catch(reject)
          })
          .catch(reject)
      })
      .catch(err => {
        Logger.error('Error updating localDb', err)
        reject(err)
      })
  })
}

function updateTree() {
  return new Promise((resolve, reject) => {
    getTree()
      .then(tree => {
        database
          .Set('tree', tree)
          .then(() => {
            resolve()
          })
          .catch(err => {
            reject(err)
          })
      })
      .catch(err => {
        Logger.error('Error updating tree', err)
        reject(err)
      })
  })
}

function regenerateAndCompact() {
  return new Promise((resolve, reject) => {
    async.waterfall(
      [
        next =>
          updateLocalDb()
            .then(() => next())
            .catch(next)
      ],
      err => {
        database.compactAllDatabases()
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}

export default {
  getListFromFolder,
  getStat,
  getFolderListFromRemoteTree,
  getFileListFromRemoteTree,
  getFolderObjectListFromRemoteTree,
  getLocalFolderList,
  getLocalFileList,
  getTree,
  getList,
  updateTree,
  updateLocalDb,
  regenerateAndCompact,
  updateUserObject
}
