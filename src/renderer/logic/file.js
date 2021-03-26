import database from '../../database/index'
import Logger from '../../libs/logger'
import Auth from './utils/Auth'
import AesUtil from './AesUtil'
import Uploader from './uploader'
import getEnvironment from './utils/libinxt'
import async from 'async'
import Tree from './tree'
import fs from 'fs'
import analytics from './utils/analytics'
import ConfigStore from '../../main/config-store'

function infoFromPath(localPath) {
  return new Promise((resolve, reject) => {
    database.dbFiles.findOne({ key: localPath }, function(err, result) {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}
// BucketId and FileId must be the NETWORK ids (mongodb)
async function removeFile(bucketId, fileId) {
  return fetch(
    `${process.env.API_URL}/api/storage/bucket/${bucketId}/file/${fileId}`,
    {
      method: 'DELETE',
      headers: await Auth.getAuthHeader()
    }
  ).catch(err => {
    Logger.error('Fetch error removing file', err)
    throw err
  })
}

// Create entry in Drive Server linked to the Bridge file
// Create entry in Drive Server linked to the Bridge file
async function createFileEntry(
  bucketId,
  bucketEntryId,
  fileName,
  fileExtension,
  size,
  folderId,
  date
) {
  const file = {
    fileId: bucketEntryId,
    name: fileName,
    type: fileExtension,
    size: size,
    folder_id: folderId,
    file_id: bucketEntryId,
    bucket: bucketId
  }
  try {
    AesUtil.decrypt(fileName, folderId)
    file.encrypt_version = '03-aes'
  } catch (e) {
    throw e
  }

  if (date) {
    file.date = date
  }
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/storage/file`, {
      method: 'POST',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify({ file })
    })
      .then(res => {
        resolve()
      })
      .catch(err => {
        Logger.log('CREATE FILE ENTRY ERROR', err)
        reject(err)
      })
  })
}

async function removeFileEntry(
  bucketId,
  bucketEntryId,
  fileName,
  fileExtension,
  size,
  folderId,
  date
) {
  const file = {
    fileId: bucketEntryId,
    name: fileName,
    type: fileExtension,
    size: size,
    folder_id: folderId,
    file_id: bucketEntryId,
    bucket: bucketId
  }
  try {
    AesUtil.decrypt(fileName, folderId)
    file.encrypt_version = '03-aes'
  } catch (e) {
    throw e
  }

  if (date) {
    file.date = date
  }
  const headers = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/storage/file`, {
      method: 'DELETE',
      mode: 'cors',
      headers: headers,
      body: JSON.stringify({ file })
    })
      .then(res => {
        resolve()
      })
      .catch(err => {
        Logger.log('CREATE FILE ENTRY ERROR', err)
        reject(err)
      })
  })
}

function restoreFile(fileObj) {
  return getEnvironment().then(storj => {
    return new Promise((resolve, reject) => {
      Uploader.uploadFile(storj, fileObj.fullpath)
        .then(() => resolve())
        .catch(reject)
    })
  })
}

// Check files that does not exists in local anymore (use last sync tree), and remove them from remote
async function cleanRemoteWhenLocalDeleted(lastSyncFailed) {
  if (lastSyncFailed) {
    return
  }
  const allData = database.dbFiles.getAllData()
  for (const item of allData) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    const stat = Tree.getStat(item.key)

    // If it doesn't exists, or it exists and now is not a file, delete from remote.
    if ((stat && !stat.isFile()) || !fs.existsSync(item.key)) {
      const bucketId = item.value.bucket
      const fileId = item.value.fileId

      try {
        if (item.value.size === 0) {
          await removeFileEntry(
            item.value.bucket,
            item.value.fileId,
            item.value.name,
            item.value.type,
            item.value.size,
            item.value.folder_id,
            item.value.updateAt
          )
        } else {
          await removeFile(bucketId, fileId)
        }
        console.log('FILE REMOVED')
        analytics
          .track({
            userId: undefined,
            event: 'file-delete',
            platform: 'desktop',
            properties: {
              email: 'email',
              file_id: fileId
            }
          })
          .catch(err => {
            Logger.error(err)
          })
        continue
      } catch (err) {
        Logger.error('Error deleting remote file %j: %s', item, err)
        throw err
      }
    } /* else {
        return
      } */
  }
}

// Delete local files that doesn't exists on remote.
// It should be called just after tree sync.
async function cleanLocalWhenRemoteDeleted(lastSyncFailed) {
  const localPath = await database.Get('xPath')
  const syncDate = await database.Get('syncStartDate')

  // List all files in the folder
  const list = await Tree.getLocalFileList(localPath)

  while (!database.tempEmpty()) {
    await new Promise(resolve => {
      setTimeout(resolve, 1500)
    })
  }

  for (const item of list) {
    const fileObj = await database.FileGet(item)

    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    if (!fileObj && !lastSyncFailed) {
      // File doesn't exists on remote database, should be locally deleted?

      const creationDate = fs.statSync(item).mtime
      creationDate.setMilliseconds(0)
      // To check if the file was added during the sync, if so, should not be deleted
      const isTemp = await database.TempGet(item)

      // Delete if: Not in temp, not was "added" or was deleted
      if (!isTemp || isTemp.value !== 'add') {
        // TODO: Watcher will track this deletion
        try {
          fs.unlinkSync(item)
          Logger.info(item + ' deleted')
        } catch (e) {
          Logger.warn(e.messages)
        }
        database.TempDel(item)
      }
      // return
    } /* else {
        // File still exists on the remote database, should not be deleted
        return
      } */
  }
}

function fileInfoFromPath(localPath) {
  return new Promise((resolve, reject) => {
    database.dbFiles.findOne({ key: localPath }, function(err, result) {
      if (err) {
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

export default {
  infoFromPath,
  removeFile,
  createFileEntry,
  restoreFile,
  cleanRemoteWhenLocalDeleted,
  cleanLocalWhenRemoteDeleted,
  fileInfoFromPath,
  removeFileEntry
}
