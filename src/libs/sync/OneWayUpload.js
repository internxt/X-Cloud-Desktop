import SyncInterface from './SyncInterface'
import async from 'async'
import GetInstance from '../database'
import SyncUtils from './utils'
import path from 'path'

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
        // Identify folders
        folderList.forEach(item => { item.isFile = item.stats.isFile() })
        next(null, folderList)
      },
      (folderList, next) => {
        folderList.forEach(item => {
          if (item.isFile) {
            const relativePath = path.relative(this.user.path, path.dirname(item.fullPath))
            SyncUtils.CreateFolders(relativePath).then(result => {
              console.log(result)
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
