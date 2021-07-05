import Logger from '../../libs/logger'
import Auth from './utils/Auth'
import fs from 'fs'
import path from 'path'
import rimraf from 'rimraf'
import Tree from './tree'
import Database from '../../database'
import analytics from './utils/analytics'
import ConfigStore from '../../main/config-store'
import state from './utils/state'
import lodash from 'lodash'
import nameTest from './utils/nameTest'
import crypt from './crypt'
import SyncMode from './sync/NewTwoWayUpload'
import SelectiveMiddleware from './selectiveSyncMiddleware'
import PathTrie from './utils/pathTrie'

const remote = require('@electron/remote')

// eslint-disable-next-line no-empty-character-class
const invalidName = /[\\/]|[. ]$|^\.[]*/

function getTempFolderPath() {
  return path.join(remote.app.getPath('userData'), '.internxt-desktop', 'tmp')
}

function clearTempFolder() {
  return new Promise((resolve, reject) => {
    const tempPath = getTempFolderPath()

    if (!fs.existsSync(tempPath)) {
      return resolve()
    }

    rimraf(tempPath, () => resolve())
  })
}

function create(folder) {
  fs.mkdirSync(folder.key, { recursive: true })
  if (folder.state === state.state.DOWNLOAD) {
    folder.state = state.state.SYNCED
    folder.needSync = false
    folder.nameChecked = true
  }
}
function ignore(folder) {
  folder.nameChecked = true
  folder.state = state.state.IGNORELOCALNOTEXISTS
  folder.needSync = false
}

function createLocalFolder(select, selectIndex, folder, basePath) {
  if (folder.nameChecked) {
    create(folder)
    // return
  } else {
    const parentDir = path.dirname(folder.key)
    const parent =
      selectIndex[folder.key] !== undefined
        ? select[selectIndex[parentDir]]
        : undefined
    if (parentDir !== basePath) {
      if (!parent.nameChecked) {
        createLocalFolder(select, selectIndex, parent, basePath)
      }
      if (state.ignoredState.includes(parent.state)) {
        ignore(folder)
        return
      }
    }
    if (
      invalidName.test(path.basename(folder.key)) ||
      nameTest.invalidFolderName(path.basename(folder.key), basePath)
    ) {
      ignore(folder)
    } else {
      create(folder)
    }
  }
}

async function createRemoteFolder(folders) {
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/desktop/folders`, {
      method: 'POST',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(folders)
    })
      .then(res => {
        if (res.status !== 201) {
          throw Error('Error creating new folder', res)
        }
        return res.text()
      })
      .then(text => {
        try {
          return JSON.parse(text)
        } catch (err) {
          throw new Error(err + ' data: ' + text)
        }
      })
      .then(res => {
        analytics
          .track({
            userId: undefined,
            event: 'folder-created',
            properties: {
              email: 'email'
            }
          })
          .catch(err => {
            Logger.error(err)
          })
        return resolve(res)
      })
      .catch(reject)
  })
}

async function removeFolders() {
  var select = await Database.dbFind(Database.dbFolders, {})
  select.sort((a, b) => {
    return b.key.length - a.key.length
  })
  for (const folder of select) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    if (!folder.select) {
      if (fs.readdirSync(folder.key).length === 0) {
        try {
          fs.rmdirSync(folder.key)
          await Database.dbRemoveOne(Database.dbFolders, { key: folder.key })
        } catch (e) {
          if (!/no such file or directory/.test(e.message)) {
            await Database.dbRemoveOne(Database.dbFolders, { key: folder.key })
            continue
          }
        }
      }
      continue
    }
    if (folder.state === state.state.DELETEIGNORE) {
      await Database.dbRemoveOne(Database.dbFolders, { key: folder.key })
      continue
    }
    if (
      !folder.needSync ||
      (folder.state !== state.state.DELETE_CLOUD &&
        folder.state !== state.state.DELETE_LOCAL)
    ) {
      continue
    }
    try {
      if (folder.state === state.state.DELETE_CLOUD) {
        if (!fs.existsSync(folder.key)) {
          if (folder.value && folder.value.id) {
            await removeFolder(folder.value.id, folder.key)
          }
          await Database.dbRemoveOne(Database.dbFolders, { key: folder.key })
          continue
        } else {
          folder.state = state.state.SYNCED
          folder.needSync = false
          await Database.dbUpdateOne(
            Database.dbFolders,
            { key: folder.key },
            { $set: folder }
          )
          continue
        }
      }
      if (folder.state === state.state.DELETE_LOCAL) {
        if (
          fs.existsSync(folder.key) &&
          fs.readdirSync(folder.key).length !== 0
        ) {
          folder.state = state.state.UPLOAD
          folder.needSync = true
          await Database.dbUpdateOne(
            Database.dbFolders,
            { key: folder.key },
            { $set: folder }
          )
          continue
        } else {
          removeLocalFolder(folder.key)
          await Database.dbRemoveOne(Database.dbFolders, { key: folder.key })
          continue
        }
      }
    } catch (err) {
      if (/UploadOnly/.test(err.message)) {
        return
      }
      Logger.error(err)
      continue
    }
  }
}

function removeLocalFolder(path) {
  if (SyncMode.isUploadOnly()) {
    throw new Error('UploadOnly')
  }
  remote.app.emit('set-tooltip', `Removing local folder ${path}`)
  Logger.log(`Removing local folder ${path}`)
  try {
    fs.rmdirSync(path)
  } catch (e) {
    if (!/no such file or directory/.test(e.message)) {
      throw e
    }
  }
}

async function createFolders() {
  var select = await Database.dbFind(Database.dbFolders, {})
  const user = await Database.Get('xUser')
  const basePath = await Database.Get('xPath')
  const rootId = user.user.root_folder_id
  var selectIndex = []
  let i = 0
  select.forEach(elem => {
    selectIndex[elem.key] = i++
  })
  select.sort((a, b) => {
    return a.key.length - b.key.length
  })
  const needUpload = []
  needUpload[basePath] = { children: [], id: rootId }
  let totalFolder = 0
  for (const folder of select) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    if (!folder.needSync || state.ignoredState.includes(folder.state)) {
      continue
    }
    if (folder.state === state.state.DOWNLOAD) {
      if (!SyncMode.isUploadOnly()) {
        try {
          createLocalFolder(select, selectIndex, folder, basePath)
        } catch (e) {
          Logger.error(`Error creating local folder ${folder.key} Error: ${e}`)
          continue
        }
      }
      continue
    }
    if (folder.state === state.state.UPLOAD) {
      if (!folder.nameChecked && invalidName.test(path.basename(folder.key))) {
        folder.nameChecked = true
        folder.state = state.state.IGNORECLOUDNOTEXISTS
        folder.needSync = false
        Logger.warn(
          `Name invalid because contain /\\ or end with space ${folder.key}`
        )
        if (needUpload[folder.key]) {
          totalFolder -= needUpload[folder.key].children.length
          delete needUpload[folder.key]
        }
        continue
      }
      const parentDir = path.dirname(folder.key)
      folder.nameChecked = true
      const parent = select[selectIndex[parentDir]]
      if (parent && !parent.select) {
        folder.select = false
        continue
      }
      if (parentDir !== basePath && state.ignoredState.includes(parent.state)) {
        folder.nameChecked = true
        folder.state = state.state.IGNORECLOUDNOTEXISTS
        folder.needSync = false
        Logger.warn(
          `Name invalid because name of parent folder is invalid ${folder.key}`
        )
      }
      totalFolder++
      if (needUpload[parentDir]) {
        needUpload[parentDir].children.push(folder.key)
      } else {
        needUpload[parentDir] = {
          children: [folder.key],
          id: parent.value ? parent.value.id : undefined
        }
      }
    }
  }
  ConfigStore.set('updatingDB', true)
  await Database.ClearFoldersSelect()
  var insertPromise = Database.dbInsert(Database.dbFolders, select).then(() => {
    ConfigStore.set('updatingDB', false)
  })
  var done = false
  const maxLength = 500
  let folderUploaded = 0
  while (!done) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    const uploadingFolders = {}
    const encryptDict = []
    const foldersUploaded = []
    let length = 0
    remote.app.emit(
      'set-tooltip',
      `uploading folders ${folderUploaded}/${totalFolder}`
    )
    for (const key of Object.keys(needUpload)) {
      if (needUpload[key].id === undefined || needUpload[key].children === []) {
        continue
      }
      const parentId = needUpload[key].id
      while (needUpload[key].children.length > 0) {
        const folderOriginalKey = needUpload[key].children.shift()
        const encryptName = crypt.encryptName(
          path.basename(folderOriginalKey),
          parentId
        )
        if (uploadingFolders[parentId] === undefined) {
          uploadingFolders[parentId] = [encryptName]
        } else {
          uploadingFolders[parentId].push(encryptName)
        }
        encryptDict[encryptName] = folderOriginalKey
        if (++length === maxLength) {
          break
        }
      }
      if (needUpload[key].children.length === 0) {
        delete needUpload[key]
      }
      if (length === maxLength) {
        break
      }
    }
    if (length !== 0) {
      try {
        const res = await createRemoteFolder(uploadingFolders)
        folderUploaded += res.length
        for (const newFolder of res) {
          const folder = select[selectIndex[encryptDict[newFolder.name]]]
          folder.value = newFolder
          folder.state = state.state.SYNCED
          folder.needSync = false
          foldersUploaded.push(folder)
          if (needUpload[encryptDict[newFolder.name]]) {
            needUpload[encryptDict[newFolder.name]].id = newFolder.id
          }
        }
      } catch (err) {
        Logger.warn('error: ', err.message)
        continue
      }
      await insertPromise
      ConfigStore.set('updatingDB', true)
      await Database.dbRemove(Database.dbFolders, {
        key: {
          $in: foldersUploaded.map(e => e.key)
        }
      })
      insertPromise = Database.dbInsert(
        Database.dbFolders,
        foldersUploaded
      ).then(() => {
        ConfigStore.set('updatingDB', false)
      })
    } else {
      done = true
      await insertPromise
    }
  }
}
async function sincronizeCloudFolder() {
  var select = await Database.dbFind(Database.dbFolders, {})
  const user = await Database.Get('xUser')
  const basePath = await Database.Get('xPath')
  var selectIndex = []
  let i = 0
  select.forEach(elem => {
    selectIndex[elem.key] = i++
  })
  var cloud = await Database.dbFind(Database.dbFoldersCloud, {
    key: { $in: Object.keys(selectIndex) }
  })
  var cloudIndex = []
  i = 0
  cloud.forEach(elem => {
    cloudIndex[elem.key] = i++
  })
  for (const f in selectIndex) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    var folder = select[selectIndex[f]]
    if (cloudIndex[f] === undefined) {
      folder = select[selectIndex[f]]
      folder.needSync = true
      folder.state = state.transition(folder.state, state.word.cloudDeleted)
    } else {
      folder.value = cloud[cloudIndex[f]].value
    }
  }
  var newFolders = select.flatMap(e => {
    if (e.value && e.value.id && e.select) {
      return { key: e.key, value: { id: e.value.id } }
    }
    return []
  })
  newFolders.push({ key: basePath, value: { id: user.user.root_folder_id } })
  var lastSyncDate = await Database.Get('lastFolderSyncDate')
  if (!lastSyncDate) {
    lastSyncDate = new Date(0)
  }
  while (newFolders.length !== 0) {
    var children = await Database.dbFind(Database.dbFoldersCloud, {
      'value.parent_id': { $in: newFolders.map(e => e.value.id) }
    })
    newFolders = lodash.differenceBy(children, newFolders, 'key')
    for (const folder of newFolders) {
      if (new Date(folder.value.created_at) >= lastSyncDate) {
        folder.needSync = true
        folder.select = true
        folder.state = state.state.DOWNLOAD
        select.push(folder)
      }
    }
  }
  ConfigStore.set('updatingDB', true)
  await Database.ClearFoldersSelect()
  await Database.dbInsert(Database.dbFolders, select)
  ConfigStore.set('updatingDB', false)
  await Database.Set('lastFolderSyncDate', new Date())
}
async function sincronizeLocalFolder() {
  const localPath = await Database.Get('xPath')
  let list = await Tree.getLocalFolderList(localPath)
  let i = 0
  const select = await Database.dbFind(Database.dbFolders, {})
  var indexDict = []
  select.forEach(elem => {
    indexDict[elem.key] = i++
  })
  for (const item of list) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    const FolderSelect = indexDict[item]
    // elect and local exist
    if (FolderSelect !== undefined) {
      select[FolderSelect].state = state.transition(
        select[FolderSelect].state,
        state.word.ensure
      )
    } else {
      // local exist, select not exist
      select.push({
        key: item,
        value: null,
        needSync: true,
        select: true,
        state: state.state.UPLOAD
      })
    }
  }
  list = lodash.difference(Object.keys(indexDict), list)
  for (const item of list) {
    // select exist, local not exist
    select[indexDict[item]].state = state.transition(
      select[indexDict[item]].state,
      state.word.localDeleted
    )
    select[indexDict[item]].needSync = true
  }
  ConfigStore.set('updatingDB', true)
  await Database.ClearFoldersSelect()
  await Database.dbInsert(Database.dbFolders, select)
  ConfigStore.set('updatingDB', false)
}

// folderId must be the CLOUD id (mysql)
// warning, this method deletes all its contents
async function removeFolder(folderId, path) {
  if (SyncMode.isUploadOnly()) {
    return true
  }
  remote.app.emit('set-tooltip', `Removing cloud folder ${path}`)
  Logger.log(`Removing cloud folder ${path}`)
  const headers = await Auth.getAuthHeader()
  const res = await fetch(
    `${process.env.API_URL}/api/storage/folder/${folderId}`,
    {
      method: 'DELETE',
      headers: headers
    }
  )
  const text = await res.text()
  if (res.status !== 204) {
    const data = JSON.parse(text)
    if (/Folder does not exists/.test(data.error)) {
      return true
    }
    throw new Error(text)
  }
  return true
}

function rootFolderExists() {
  return new Promise((resolve, reject) => {
    Database.Get('xPath')
      .then(xPath => {
        if (!xPath) {
          resolve(false)
        }

        resolve(fs.existsSync(xPath))
      })
      .catch(reject)
  })
}

async function checkSelectiveSync() {
  const actions = PathTrie.generateAction()
  if (actions.length === 0) {
    return
  }
  for (const command of actions) {
    const query = SelectiveMiddleware.generateRegExp(command.path, 0)
    if (command.action === SelectiveMiddleware.selectAction.SELECT) {
      await Database.dbUpdate(
        Database.dbFolders,
        { key: query },
        { $set: { select: true } }
      )
      const selectFolders = await Database.dbFind(Database.dbFolders, {
        key: query
      })
      const cloudFolders = await Database.dbFind(Database.dbFoldersCloud, {
        key: query
      })
      const newFolders = lodash.differenceBy(cloudFolders, selectFolders, 'key')
      newFolders.forEach(folder => {
        folder.needSync = true
        folder.select = true
        folder.state = state.state.DOWNLOAD
      })
      Database.dbInsert(Database.dbFolders, newFolders)

      await Database.dbUpdate(
        Database.dbFiles,
        { key: query },
        { $set: { select: true } }
      )
      const selectFiles = await Database.dbFind(Database.dbFiles, {
        key: query
      })
      const cloudFiles = await Database.dbFind(Database.dbFilesCloud, {
        key: query
      })
      const newFiles = lodash.differenceBy(cloudFiles, selectFiles, 'key')
      newFiles.forEach(file => {
        file.state = state.state.DOWNLOAD
        file.needSync = true
        file.select = true
      })
      Database.dbInsert(Database.dbFiles, newFiles)
    } else {
      await Database.dbUpdate(
        Database.dbFolders,
        { key: query },
        { $set: { select: false } }
      )
      await Database.dbUpdate(
        Database.dbFiles,
        { key: query },
        { $set: { select: false } }
      )
    }
  }
  PathTrie.clearTrie()
}

export default {
  createRemoteFolder,
  getTempFolderPath,
  createFolders,
  removeFolders,
  clearTempFolder,
  removeFolder,
  sincronizeLocalFolder,
  sincronizeCloudFolder,
  rootFolderExists,
  checkSelectiveSync
}
