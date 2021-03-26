import Tree from './tree'
import async from 'async'
import Database from '../../database/index'
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
import File from './file'
import analytics from '../logic/utils/analytics'
import ConfigStore from '../../main/config-store'

const { app } = require('@electron/remote')

async function downloadFileTemp(fileObj, silent = false) {
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
    try {
      fs.unlinkSync(tempFilePath)
    } catch (e) {
      Logger.error('Delete temp file: Cannot delete', e.message)
    }
  }
  Logger.log(
    'DRIVE resolveFile, bucket: %s, file: %s',
    fileObj.bucket,
    fileObj.fileId
  )

  return new Promise((resolve, reject) => {
    const state = storj.resolveFile(
      fileObj.bucket,
      fileObj.fileId,
      tempFilePath,
      {
        progressCallback: function(progress, downloadedBytes, totalBytes) {
          if (!silent) {
            let progressPtg = progress * 100
            progressPtg = progressPtg.toFixed(2)
            app.emit(
              'set-tooltip',
              'Downloading ' + originalFileName + ' (' + progressPtg + '%).'
            )
          } else {
            app.emit('set-tooltip', 'Checking ' + originalFileName)
          }
        },
        finishedCallback: function(err) {
          app.emit('set-tooltip')
          app.removeListener('sync-stop', stopDownloadHandler)
          if (err) {
            Logger.error('download failed, file id: ' + fileObj.fileId)
            reject(err)
          } else {
            Logger.log('Download finished')
            resolve(tempFilePath)
          }
        }
      }
    )

    const stopDownloadHandler = (storj, state) => {
      if (storj) {
        storj.resolveFileCancel(state)
      }
    }

    app.once('sync-stop', () => stopDownloadHandler(storj, state))
  })
}

async function downloadZeroSizeFile(fileObj, silent = false) {
  const originalFileName = path.basename(fileObj.fullpath)

  if (fs.existsSync(fileObj.fullpath)) {
    try {
      fs.unlinkSync(fileObj.fullpath)
    } catch (e) {
      Logger.error('Delete local file: Cannot delete', e.message)
    }
  }
  fs.closeSync(fs.openSync(fileObj.fullpath, 'w'))
}

// Will download ALL the files from remote
// If file already exists on local, decide if needs to be checked.
async function _downloadAllFiles() {
  // Get a list of all the files on the remote folder
  const list = Database.dbFiles.getAllData()
  const totalFiles = list.length
  let currentFiles = 0
  for (let item of list) {
    if (ConfigStore.get('stopSync')) {
      throw Error('stop sync')
    }
    currentFiles++
    item = item.value
    if (
      path.basename(item.fullpath) !== sanitize(path.basename(item.fullpath))
    ) {
      Logger.info(
        "Can't download %s, invalid filename",
        path.basename(item.fullpath)
      )
      continue
    }
    // If not enough space on hard disk, do not download and stop syncing.
    const freeSpace = await CheckDiskSpace(path.dirname(item.fullpath))
    if (item.size * 3 >= freeSpace) {
      throw new Error('No space left')
    }

    let downloadAndReplace = false
    let uploadAndReplace = false
    let ignoreThisFile = false

    // Check if local file exists
    const localExists = fs.existsSync(item.fullpath)

    // If local exists, replace, ensure or ignore
    if (localExists) {
      const stat = Tree.getStat(item.fullpath)

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
      try {
        fs.unlinkSync(item.fullpath)
        Logger.log(item.fullpath + ' deleted')
      } catch (e) {}
      await Database.TempDel(item.fullpath)
      continue
    } else if (downloadAndReplace) {
      Logger.log('DOWNLOAD AND REPLACE WITHOUT QUESTION', item.fullpath)
      analytics
        .track({
          userId: undefined,
          event: 'file-download-start',
          platform: 'desktop',
          properties: {
            email: 'email',
            file_id: item.fileId,
            file_name: item.name,
            folder_id: item.folder_id,
            file_type: item.type,
            mode: ConfigStore.get('syncMode')
          }
        })
        .catch(err => {
          Logger.error(err)
        })
      try {
        if (item.size !== 0) {
          const tempPath = await downloadFileTemp(item)
          if (localExists) {
            try {
              fs.unlinkSync(item.fullpath)
            } catch (e) {}
          }
          // fs.renameSync gives a "EXDEV: cross-device link not permitted"
          // when application and local folder are not in the same partition
          fs.copyFileSync(tempPath, item.fullpath)
          fs.unlinkSync(tempPath)
        } else {
          await downloadZeroSizeFile(item)
        }
        await Sync.setModifiedTime(item.fullpath, item.created_at)

        analytics
          .track({
            userId: undefined,
            event: 'file-download-finished',
            platform: 'desktop',
            properties: {
              email: 'email',
              file_id: item.fileId,
              file_type: item.type,
              folder_id: item.folderId,
              file_name: item.name,
              file_size: item.size,
              mode: ConfigStore.get('syncMode')
            }
          })
          .catch(err => {
            Logger.error(err)
          })
        continue
      } catch (err) {
        // On error by shard, upload again
        Logger.error(err.message)
        if (localExists) {
          Logger.error("Fatal error: Can't restore remote file: local is older")
        } else {
          Logger.error(
            "Fatal error: Can't restore remote file: local does not exists"
          )
        }
        const isError = [
          'File missing shard error',
          'Farmer request error',
          'Memory mapped file unmap error',
          'Bridge request pointer error'
        ].find(obj => obj === err.message)
        if (isError) {
          Logger.error(err.message)
        }
        await Database.dbFiles.remove({ key: item.fullpath })
        continue
      }
    } else if (uploadAndReplace) {
      const stat = Tree.getStat(item.fullpath)
      const storj = await getEnvironment()
      await Uploader.uploadFile(
        storj,
        item.fullpath,
        currentFiles,
        totalFiles,
        item
      )

      // continue
    }
  }
}

// Download all the files
function downloadFiles() {
  return new Promise((resolve, reject) => {
    _downloadAllFiles()
      .then(() => resolve())
      .catch(reject)
  })
}

// Create all existing remote folders on local path
function downloadFolders() {
  return new Promise((resolve, reject) => {
    Folder.createLocalFolders()
      .then(() => {
        resolve()
      })
      .catch(err => {
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
