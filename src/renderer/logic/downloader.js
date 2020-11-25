import Tree from './tree'
import async from 'async'
import Database from '../../database/index'
import temp from 'temp'
import path from 'path'
import fs from 'fs'
import Sync from './sync'
import Uploader from './uploader'
import CheckDiskSpace from 'check-disk-space'
import electron from 'electron'
import Logger from '../../libs/logger'
import mkdirp from 'mkdirp'
import sanitize from 'sanitize-filename'
import Folder from './folder'
import getEnvironment from './utils/libinxt'
import {client, user} from './utils/analytics'
import { event } from 'jquery'

const app = electron.remote.app

function downloadFileTemp(fileObj, silent = false) {
  return new Promise(async (resolve, reject) => {
    const storj = await getEnvironment()

    const originalFileName = path.basename(fileObj.fullpath)

    const tempPath = Folder.getTempFolderPath()

    if (!fs.existsSync(tempPath)) {
      mkdirp.sync(tempPath)
    }
    const tempFilePath = path.join(tempPath, fileObj.fileId + '.dat')

    Logger.log('Delete temp file', tempFilePath)
    // Delete temp file
    if (fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath) } catch (e) {
        Logger.error('Delete temp file: Cannot delete', e.message)
      }
    }

    Logger.log('DRIVE resolveFile, bucket: %s, file: %s', fileObj.bucket, fileObj.fileId)
    const state = storj.resolveFile(fileObj.bucket, fileObj.fileId, tempFilePath, {
      progressCallback: function (progress, downloadedBytes, totalBytes) {
        if (!silent) {
          let progressPtg = progress * 100
          progressPtg = progressPtg.toFixed(2)
          app.emit('set-tooltip', 'Downloading ' + originalFileName + ' (' + progressPtg + '%).')
        } else {
          app.emit('set-tooltip', 'Checking ' + originalFileName)
        }
      },
      finishedCallback: function (err) {
        app.emit('set-tooltip')
        app.removeListener('sync-stop', stopDownloadHandler)
        if (err) { reject(err) } else {
          Logger.log('Download finished')
          resolve(tempFilePath)
        }
      }
    })

    const stopDownloadHandler = (storj, state) => {
      storj.resolveFileCancel(state)
    }

    app.on('sync-stop', () => stopDownloadHandler(storj, state))
  })
}

// Will download ALL the files from remote
// If file already exists on local, decide if needs to be checked.
function _downloadAllFiles() {
  return new Promise((resolve, reject) => {
    // Get a list of all the files on the remote folder
    Tree.GetFileListFromRemoteTree().then(list => {
      const totalFiles = list.length
      let currentFiles = 0
      async.eachSeries(list, async (item, next) => {
        currentFiles++
        if (path.basename(item.fullpath) !== sanitize(path.basename(item.fullpath))) {
          Logger.info('Can\'t download %s, invalid filename', path.basename(item.fullpath))
          return next()
        }
        // If not enough space on hard disk, do not download and stop syncing.
        const freeSpace = await CheckDiskSpace(path.dirname(item.fullpath))
        if (item.size * 3 >= freeSpace) { return next('No space left') }

        let downloadAndReplace = false
        let uploadAndReplace = false
        let ignoreThisFile = false

        // Check if local file exists
        const localExists = fs.existsSync(item.fullpath)

        // If local exists, replace, ensure or ignore
        if (localExists) {
          const stat = Tree.GetStat(item.fullpath)

          // "Created at" time from remote database
          const remoteTime = new Date(item.created_at)
          remoteTime.setMilliseconds(0)
          // "Modified at" from local file
          const localTime = stat.mtime
          localTime.setMilliseconds(0)

          // Warning, milliseconds are not recorded, so we set to 0 to avoid false comparisons

          if (remoteTime > localTime) {
            downloadAndReplace = true
          } else if (localTime > remoteTime) {
            uploadAndReplace = true
          }
        } else {
          // Was deleted during the sync?
          const isLocallyDeleted = await Database.TempGet(item.fullpath)

          if (isLocallyDeleted && isLocallyDeleted.value === 'unlink') {
            ignoreThisFile = true
          } else {
            downloadAndReplace = true
          }
        }

        if (ignoreThisFile) {
          try { fs.unlinkSync(item.fullpath) } catch (e) { }
          Database.TempDel(item.fullpath)
          return next()
        } else if (downloadAndReplace) {
          Logger.log('DOWNLOAD AND REPLACE WITHOUT QUESTION', item.fullpath)
          client.track(
            {
              userId: user.getUser().uuid,
              event: 'file-download-start',
              platform: 'desktop',
              properties: {
                email: user.getUser().email,
                file_id: item.fileId,
                file_name: item.name,
                folder_id: item.folder_id,
                file_type: item.type,
                mode: user.getSyncMode()
              }

            }
          )
          downloadFileTemp(item).then(tempPath => {
            if (localExists) { try { fs.unlinkSync(item.fullpath) } catch (e) { } }
            // fs.renameSync gives a "EXDEV: cross-device link not permitted"
            // when application and local folder are not in the same partition
            fs.copyFileSync(tempPath, item.fullpath)
            fs.unlinkSync(tempPath)
            Sync.SetModifiedTime(item.fullpath, item.created_at).then(() => {
              client.track(
                {
                  userId: user.getUser().uuid,
                  event: 'file-download-finished',
                  platform: 'desktop',
                  properties: {
                    email: user.getUser().email,
                    file_id: item.fileId,
                    mode: user.getSyncMode()
                  }
                }
              )
              next(null)
            }).catch(next)
          }).catch(err => {
            // On error by shard, upload again
            Logger.error(err.message)
            if (localExists) {
              Logger.error('Fatal error: Can\'t restore remote file: local is older')
            } else {
              Logger.error('Fatal error: Can\'t restore remote file: local does not exists')
            }
            next()
          })
        } else if (uploadAndReplace) {
          const storj = await getEnvironment()
          Uploader.uploadFile(storj, item.fullpath, currentFiles, totalFiles).then(() => next()).catch(next)
        } else {
          // Check if should download to ensure file
          const shouldEnsureFile = Math.floor(Math.random() * 33 + 1) % 33 === 0

          if (!shouldEnsureFile) {
            // Logger.log('%cNO ENSURE FILE', 'background-color: #aaaaff')
            return next()
          }
          Logger.log('%cENSURE FILE ' + item.filename, 'background-color: #aa00aa, color: #ffffff')
          // Check file is ok
          downloadFileTemp(item, true).then(tempPath => next()).catch(err => {
            const isError = [
              'File missing shard error',
              'Farmer request error',
              'Memory mapped file unmap error',
              'Bridge request pointer error'
            ].find(obj => obj === err.message)

            if (isError && localExists) {
              Logger.error('%s. Reuploading...', isError)
              File.RestoreFile(item).then(() => next()).catch(next)
            } else {
              Logger.error('Cannot restore missing file', err.message)
              next()
            }
          })
        }
      }, (err, result) => {
        if (err) { reject(err) } else { resolve() }
      })
    }).catch(reject)
  })
}

// Download all the files
function downloadFiles() {
  return new Promise((resolve, reject) => {
    _downloadAllFiles().then(() => resolve()).catch(reject)
  })
}

// Create all existing remote folders on local path
function downloadFolders() {
  return new Promise((resolve, reject) => {
    Folder.createLocalFolders().then(() => {
      resolve()
    }).catch(err => {
      Logger.error('Error creating local folders', err)
      reject(err)
    })
  })
}

export default {
  downloadFiles,
  downloadFileTemp,
  downloadFolders
}
