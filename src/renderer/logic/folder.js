import Logger from '../../libs/logger'
import Auth from './utils/Auth'
import fs from 'fs'
import path from 'path'
import electron from 'electron'
import rimraf from 'rimraf'
import Tree from './tree'
import Database from '../../database'
import async from 'async'
import sanitize from 'sanitize-filename'
import analytics from './utils/analytics'
import ConfigStore from '../../main/config-store'
const remote = require('@electron/remote')
async function createRemoteFolder(name, parentId) {
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    const folder = {
      folderName: name,
      parentFolderId: parentId
    }

    fetch(`${process.env.API_URL}/api/storage/folder`, {
      method: 'POST',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify(folder)
    })
      .then(res => {
        if (res.status !== 201 && res.status !== 500) {
          throw Error('Error creating new folder', res)
        }
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
        if (res.data.error) {
          if (
            res.data.error.includes('Folder with the same name already exists')
          ) {
            Logger.warn('Folder with the same name already exists')
            resolve()
          } else {
            reject(res.data.error)
          }
        } else {
          analytics
            .track({
              userId: undefined,
              event: 'folder-created',
              platform: 'desktop',
              properties: {
                email: 'email',
                file_id: res.data.id
              }
            })
            .catch(err => {
              Logger.error(err)
            })
          resolve(res.data)
        }
      })
      .catch(reject)
  })
}

function getTempFolderPath() {
  return path.join(
    remote.app.getPath('home'),
    '.internxt-desktop',
    'tmp'
  )
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

// Delete local folders that doesn't exists on remote. [helper for deleteLocalWhenRemoteDeleted]
async function _deleteLocalWhenRemoteDeleted(lastSyncFailed) {
  const localPath = await Database.Get('xPath')
  const syncDate = Database.Get('syncStartDate')

  while (!Database.tempEmpty()) {
    await new Promise(resolve => {
      setTimeout(resolve, 1500)
    })
  }

  // Get a list of all local folders
  const list = await Tree.getLocalFolderList(localPath)

  for (const item of list) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    try {
      const folder = await Database.FolderGet(item)

      if (folder || lastSyncFailed) {
        // Folder still exists in remote, nothing to do
        await Database.TempDel(item)
        continue
      } else {
        // Should DELETE that folder in local
        const creationDate = fs.statSync(item).mtime
        creationDate.setMilliseconds(0)
        const isTemp = await Database.TempGet(item)
        // Delete only if:
        // - Was created before the sync started (nothing changed)
        // - Is not on temp Database (watcher flag)
        // - If is on watcher Database for any reason, the reason is not "just added" during sync.
        if (creationDate <= syncDate || !isTemp || isTemp.value !== 'addDir') {
          await new Promise((resolve, reject) => {
            rimraf(item, err => {
              Logger.info(item + ' deleted')
              if (err) {
                console.log(err)
              }
              resolve()
            })
          })
        } else {
          await Database.TempDel(item)
          continue
        }
      }
    } catch (err) {
      Logger.warn('ITEM ERR', err)
      continue
    }
  }
}

// Check folders that does not exists in local anymore, and delete those folders on remote
async function _deleteRemoteFoldersWhenLocalDeleted(lastSyncFailed) {
  if (lastSyncFailed) {
    return
  }
  const allData = Database.dbFolders.getAllData()
  for (const item of allData) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    const stat = Tree.getStat(item.key)
    if (path.basename(item.key) !== sanitize(path.basename(item.key))) {
      continue
    }

    // If doesn't exists, or now is a file (was a folder before) delete from remote.
    if ((stat && stat.isFile()) || !fs.existsSync(item.key)) {
      await removeFolder(item.value.id)
      try {
        await Database.dbFolders.remove({ key: item.key })
        analytics
          .track({
            userId: undefined,
            event: 'folder-delete',
            platform: 'desktop',
            properties: {
              email: 'email',
              file_id: item.value.id
            }
          })
          .catch(err => {
            Logger.error(err)
          })
        continue
      } catch (err) {
        Logger.error('Error removing remote folder %s, %j', item.value, err)
        throw err
      }
    } /* else {
        return
      } */
  }
}

// Delete local folders missing in remote
function cleanLocalWhenRemoteDeleted(lastSyncFailed) {
  return new Promise((resolve, reject) => {
    _deleteLocalWhenRemoteDeleted(lastSyncFailed)
      .then(() => resolve())
      .catch(reject)
  })
}

// Missing folders with entry in local db
function cleanRemoteWhenLocalDeleted(lastSyncFailed) {
  return new Promise((resolve, reject) => {
    _deleteRemoteFoldersWhenLocalDeleted(lastSyncFailed)
      .then(resolve)
      .catch(reject)
  })
}

// folderId must be the CLOUD id (mysql)
// warning, this method deletes all its contents
async function removeFolder(folderId) {
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    Database.Get('xUser').then(userData => {
      fetch(`${process.env.API_URL}/api/storage/folder/${folderId}`, {
        method: 'DELETE',
        headers: headers
      })
        .then(result => {
          resolve(result)
        })
        .catch(err => {
          reject(err)
        })
    })
  })
}

// Create all remote folders on local path
async function createLocalFolders() {
  // Get a list of all the folders on the remote tree
  const list = Database.dbFolders.getAllData()

  for (const folder of list) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    // Create the folder, doesn't matter if already exists.
    try {
      fs.mkdirSync(folder.key, { recursive: true })
      continue
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Folder already exists, ignore error
        continue
      } else {
        // If we cannot create the folder, we won't be able to download it's files.
        Logger.error('Error creating folder %s: %j', folder, err)
        throw err
      }
    }
  }
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

export default {
  createRemoteFolder,
  getTempFolderPath,
  clearTempFolder,
  cleanLocalWhenRemoteDeleted,
  cleanRemoteWhenLocalDeleted,
  removeFolder,
  createLocalFolders,
  rootFolderExists
}
