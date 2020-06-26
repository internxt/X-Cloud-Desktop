import SyncInterface from './SyncInterface'
import async from 'async'
import GetInstance from '../database'
import SyncUtils from './utils'
import path from 'path'
import sanitizeFilename from 'sanitize-filename'
import Logger from '../logger'

class OneWayUpload extends SyncInterface {
  constructor() {
    super()
    this.initialized = false
    this.user = null
  }

  async init() {
    let Database = await GetInstance()
    return Database.User.find().then(result => {
      const user = result[0]
      this.user = user
      this.initialized = true
    })
  }

  async start() {
    if (!this.initialized) { return }
    return async.waterfall([
      next => {
        SyncUtils.ListLocalFolder(this.user.path).then(result => {
          next(null, result)
        }).catch(err => next(err))
      },
      (folderList, next) => {
        // Ignore symbolic links
        // Ignore dirty filenames
        const noSymLinks = folderList.filter(item => {
          const sanitized = sanitizeFilename(item.basename)
          const isSymLink = item.stats.isSymbolicLink()
          item.isFile = item.stats.isFile()
          item.isFolder = !item.isFile
          if (sanitized !== item.basename) {
            Logger.error(`Item ${item.fullPath} ignored: Filename contains invalid characters`)
          }
          if (isSymLink) {
            Logger.error(`Item ${item.fullPath} ignored: is a symbolic link`)
          }
          return !isSymLink && sanitized === item.basename
        })
        next(null, noSymLinks)
      },
      (folderList, next) => {
        // Sort items
        folderList.sort((itemA, itemB) => {
          if (itemA.isFile === itemB.isFile) {
            // If both items are files, or both are folders:
            // sort by path alphabetically
            // So parent folders will go first
            return itemA.fullPath.localeCompare(itemB.fullPath)
          }
          // If one item is file, and other is folder:
          // Folders goes FIRST, files needs folders existence
          return itemA.isFile && itemB.isFolder ? 1 : -1
        })

        folderList.forEach(item => {
          if (item.isFile) {
            const relativePath = path.relative(this.user.path, path.dirname(item.fullPath))
            console.log('Relative Path', relativePath)
            SyncUtils.CreateFolders(relativePath).then(result => {
              // console.log(result)
            })
          } else {
            SyncUtils.CheckFolderExists(item.path).then(r => {
              console.log('Result:', r)
            }).catch(err => {
              console.log('Error:', err)
            })
          }
        })
      }
    ], err => {
      if (err) {
        console.log('One Way Sync failed')
      } else {
        console.log('FIN')
      }
    })
  }
}

export default OneWayUpload
