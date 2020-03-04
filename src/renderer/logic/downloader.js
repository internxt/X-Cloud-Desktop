import Tree from './tree'
import async from 'async'
import Database from '../../database/index'
import { Environment } from './inxtdeps'
import temp from 'temp'
import path from 'path'
import fs from 'fs'
import Sync from './sync'
import CheckDiskSpace from 'check-disk-space'
import electron from 'electron'
import Logger from '../../libs/logger'

const app = electron.remote.app

async function _getStorjCredentials() {
  const mnemonic = await Database.Get('xMnemonic')
  const userInfo = (await Database.Get('xUser')).user

  const options = {
    bridgeUrl: 'https://api.internxt.com',
    bridgeUser: userInfo.email,
    bridgePass: userInfo.userId,
    encryptionKey: mnemonic
  }

  return options
}

function _getEnvironment() {
  return new Promise(async (resolve, reject) => {
    const options = await _getStorjCredentials()
    const storj = new Environment(options)
    resolve(storj)
  })
}

function DownloadFileTemp(fileObj, silent = false) {
  return new Promise(async (resolve, reject) => {
    const storj = await _getEnvironment()

    const originalFileName = path.basename(fileObj.fullpath)

    const tempPath = temp.dir
    const tempFilePath = path.join(tempPath, fileObj.fileId + '.dat')

    // Delete temp file
    if (fs.existsSync(tempFilePath)) { try { fs.unlinkSync(tempFilePath) } catch (e) { } }

    storj.resolveFile(fileObj.bucket, fileObj.fileId, tempFilePath, {
      progressCallback: function (progress, downloadedBytes, totalBytes) {
        if (!silent) {
          let progressPtg = progress * 100
          progressPtg = progressPtg.toFixed(2)
          app.emit('set-tooltip', 'Downloading ' + originalFileName + ' (' + progressPtg + '%)')
        } else {
          app.emit('set-tooltip', 'Checking ' + originalFileName)
        }
      },
      finishedCallback: function (err) {
        app.emit('set-tooltip')
        if (err) { reject(err) } else {
          Sync.SetModifiedTime(tempFilePath, fileObj.created_at).then(() => resolve(tempFilePath)).catch(reject)
        }
      }
    })
  })
}

function RestoreFile(fileObj) {
  return new Promise(async (resolve, reject) => {
    const storj = await _getEnvironment()
    Sync.UploadFile(storj, fileObj.fullpath).then(() => resolve()).catch(reject)
  })
}

// Will download ALL the files from remote
// If file already exists on local, decide if needs to be checked.
function DownloadAllFiles() {
  return new Promise((resolve, reject) => {
    // Get a list of all the files on the remote folder
    Tree.GetFileListFromRemoteTree().then(list => {
      async.eachSeries(list, async (item, next) => {
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
          // "Modified at" from local file
          const localTime = stat.mtime

          if (remoteTime > localTime) { downloadAndReplace = true } else if (localTime > remoteTime) { uploadAndReplace = true }
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
          DownloadFileTemp(item).then(tempPath => {
            if (localExists) { try { fs.unlinkSync(item.fullpath) } catch (e) { } }
            fs.renameSync(tempPath, item.fullpath)
            next(null)
          }).catch(err => {
            // On error by shard, upload again
            Logger.error(err)
            if (localExists) {
              Logger.error('Fatal error: Can\'t restore remote file: local is older')
            } else {
              Logger.error('Fatal error: Can\'t restore remote file: local does not exists')
            }
            next()
          })
        } else if (uploadAndReplace) {
          let storj = await _getEnvironment()
          Sync.UploadFile(storj, item.fullpath).then(() => next()).catch(next)
        } else {
          // Check if should download to ensure file
          let shouldEnsureFile = false
          if (!shouldEnsureFile) { return next() }
          Logger.log('DOWNLOAD JUST TO ENSURE FILE')
          // Check file is ok
          DownloadFileTemp(item, true).then(tempPath => next()).catch(err => {
            if (err.message === 'File missing shard error' && localExists) {
              Logger.error('Missing shard error. Reuploading...')
              RestoreFile(item).then(() => next()).catch(next)
            } else {
              Logger.error('Cannot upload local final')
              next(err)
            }
          })
        }
      }, (err, result) => {
        if (err) { reject(err) } else { resolve() }
      })
    }).catch(reject)
  })
}

function UploadAllNewFiles() {
  return new Promise(async (resolve, reject) => {
    const localPath = await Database.Get('xPath')
    // Get the local tree from folder (not remote or database) to check for new files.
    // The list contains the files and folders.
    const arbol = Tree.GetListFromFolder(localPath)
    const storj = await _getEnvironment()

    async.eachSeries(arbol, async function (item, next) {
      // Read filesystem data
      var stat = Tree.GetStat(item)

      if (stat.isFile()) { // Is a file
        // Check if file exists in the remote database
        let entry = await Database.FileGet(item)

        if (!entry) {
          // File is not present on the remote database, so it's a new file. Let's upload.
          if (stat.size === 0) {
            // The network can't hold empty files. Encryption will fail.
            // So, we will ignore this file.
            Logger.log('Warning: Filesize 0. Ignoring file.')
            next()
          } else {
            // Upload file.
            Sync.UploadNewFile(storj, item).then(() => next()).catch(next)
          }
        } else {
          // Is not a file, so it is a dir. Do nothing.
          next()
        }
      } else {
        next()
      }
    }, (err, result) => {
      if (err) {
        if (err.message.includes('already exists')) {
          resolve()
        } else {
          Logger.error('Downloader Error uploading file', err)
          reject(err)
        }
      } else {
        resolve()
      }
    })
  })
}

function UploadAllNewFolders() {
  return new Promise(async (resolve, reject) => {
    const localPath = await Database.Get('xPath')
    const userInfo = await Database.Get('xUser')

    let lastParentId = null
    // Último directorio que ha sido
    let lastParentFolder = null

    Tree.GetLocalFolderList(localPath).then(list => {
      async.eachSeries(list, async (item, next) => {
        const dbEntry = await Database.FolderGet(item)
        // If folder exists on remote database, ignore it, it already exists
        if (dbEntry) { return next() }

        // Substract parent path and folder name
        const folderName = path.basename(item)
        const parentPath = path.dirname(item)

        // Get the parent folder ID from remote database
        let lastFolder = await Database.FolderGet(parentPath)

        // If parent folder exists on database, pick its ID
        let lastFolderId = lastFolder && lastFolder.value && lastFolder.value.id

        // If the parent path is the root of the target path, get the root_folder_id from user info
        let parentId = parentPath === localPath ? userInfo.user.root_folder_id : lastFolderId

        /*
          En este punto nos encontramos con un dilema.
          Si el usuario ha introducido un árbol complejo con subdirectorios,
          nos podemos encontrar en la situación de que el padre del directorio que
          queremos crear ahora mismo, ha sido creado recientemente por este mismo proceso.

          Por tanto, aún no conocemos qué ID se le ha asignado en la base de datos.

          Sin la ID del padre no podemos crear subdirectorios.
        */

        if (parentPath === lastParentFolder) {
          parentId = lastParentId
        } else if (lastParentFolder) {
          lastParentFolder = null
          lastParentId = null
        }

        if (parentId) {
          Sync.RemoteCreateFolder(folderName, parentId).then(async (result) => {
            result.isVirtual = true
            // Save the new folder info into Folders DB to have its ID available
            await Database.FolderSet(item, result)
            await Database.TempDel(item)
            lastParentId = result ? result.id : null
            lastParentFolder = result ? item : null
            next()
          }).catch(err => {
            Logger.error('Error creating remote folder', err)
            next(err)
          })
        } else {
          Logger.error('Upload new folders: Undefined parent ID')
          next()
        }
      }, (err) => {
        if (err) {
          Logger.error(err)
          reject(err)
        } else {
          resolve()
        }
      })
    }).catch(reject)
  })
}

export default {
  DownloadAllFiles,
  UploadAllNewFiles,
  UploadAllNewFolders
}
