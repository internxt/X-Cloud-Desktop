import database from '../../database/index'
import Logger from '../../libs/logger'
import Auth from './utils/Auth'
import AesUtil from './AesUtil'
import Uploader from './uploader'
import getEnvironment from './utils/libinxt'
import async from 'async'
import Tree from './tree'
import fs from 'fs'
import {client, user} from './utils/analytics'

function FileInfoFromPath(localPath) {
  return new Promise((resolve, reject) => {
    database.dbFiles.findOne({ key: localPath }, function (err, result) {
      if (err) { reject(err) } else { resolve(result) }
    })
  })
}
// BucketId and FileId must be the NETWORK ids (mongodb)
function RemoveFile(bucketId, fileId) {
  return new Promise(async (resolve, reject) => {
    database.Get('xUser').then(async userData => {
      fetch(`${process.env.API_URL}/api/storage/bucket/${bucketId}/file/${fileId}`, {
        method: 'DELETE',
        headers: await Auth.GetAuthHeader()
      }).then(result => {
        resolve(result)
      }).catch(err => {
        Logger.error('Fetch error removing file', err)
        reject(err)
      })
    })
  })
}

// Create entry in Drive Server linked to the Bridge file
// Create entry in Drive Server linked to the Bridge file
async function CreateFileEntry(bucketId, bucketEntryId, fileName, fileExtension, size, folderId, date) {
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

  }

  if (date) {
    file.date = date
  }

  return new Promise(async (resolve, reject) => {
    const userData = await database.Get('xUser')

    fetch(`${process.env.API_URL}/api/storage/file`, {
      method: 'POST',
      mode: 'cors',
      headers: await Auth.GetAuthHeader(),
      body: JSON.stringify({ file })
    }).then(res => {
      resolve()
    }).catch(err => {
      Logger.log('CREATE FILE ENTRY ERROR', err)
      reject(err)
    })
  })
}

function RestoreFile(fileObj) {
  return new Promise(async (resolve, reject) => {
    const storj = await getEnvironment()
    Uploader.UploadFile(storj, fileObj.fullpath).then(() => resolve()).catch(reject)
  })
}

// Check files that does not exists in local anymore (use last sync tree), and remove them from remote
function cleanRemoteWhenLocalDeleted(lastSyncFailed) {
  return new Promise((resolve, reject) => {
    if (lastSyncFailed) {
      return resolve()
    }
    const allData = database.dbFiles.getAllData()
    async.eachSeries(allData, (item, next) => {
      const stat = Tree.GetStat(item.key)

      // If it doesn't exists, or it exists and now is not a file, delete from remote.
      if ((stat && !stat.isFile()) || !fs.existsSync(item.key)) {
        const bucketId = item.value.bucket
        const fileId = item.value.fileId

        RemoveFile(bucketId, fileId).then(() => {
          client.track(
            {
              userId: user.getUser().uuid,
              event: 'file-delete',
              platform: 'desktop',
              properties: {
                email: user.getUser().email,
                file_id: fileId
              }

            }
          )
          next()
        }).catch(err => {
          Logger.error('Error deleting remote file %j: %s', item, err)
          next(err)
        })
      } else {
        next()
      }
    }, (err, result) => {
      if (err) { reject(err) } else { resolve(result) }
    })
  })
}

// Delete local files that doesn't exists on remote.
// It should be called just after tree sync.
function cleanLocalWhenRemoteDeleted(lastSyncFailed) {
  return new Promise(async (resolve, reject) => {
    const localPath = await database.Get('xPath')
    const syncDate = database.Get('syncStartDate')

    // List all files in the folder
    Tree.GetLocalFileList(localPath).then(list => {
      async.eachSeries(list, (item, next) => {
        database.FileGet(item).then(async fileObj => {
          if (!fileObj && !lastSyncFailed) {
            // File doesn't exists on remote database, should be locally deleted?

            const creationDate = fs.statSync(item).mtime
            creationDate.setMilliseconds(0)
            // To check if the file was added during the sync, if so, should not be deleted
            const isTemp = await database.TempGet(item)

            // Also check if the file was present in remote during the last sync
            const wasDeleted = await new Promise((resolve, reject) => {
              database.dbLastFiles.findOne({ key: item }, (err, result) => {
                if (err) { reject(err) } else { resolve(result) }
              })
            })

            // Delete if: Not in temp, not was "added" or was deleted
            if (!isTemp || isTemp.value !== 'add' || wasDeleted) {
              // TODO: Watcher will track this deletion
              try { fs.unlinkSync(item) } catch (e) { }
              database.TempDel(item)
            }
            next()
          } else {
            // File still exists on the remote database, should not be deleted
            next()
          }
        }).catch(next)
      }, (err) => {
        if (err) { reject(err) } else { resolve() }
      })
    }).catch(reject)
  })
}

function fileInfoFromPath(localPath) {
  return new Promise((resolve, reject) => {
    database.dbFiles.findOne({ key: localPath }, function (err, result) {
      if (err) { reject(err) } else { resolve(result) }
    })
  })
}

export default {
  FileInfoFromPath,
  RemoveFile,
  CreateFileEntry,
  RestoreFile,
  cleanRemoteWhenLocalDeleted,
  cleanLocalWhenRemoteDeleted,
  fileInfoFromPath
}
