import chokidar from 'chokidar'
import database from '../../database/index'
import Logger from '../../libs/logger'
const remote = require('@electron/remote')

let watcherStarted = false
let watcher = null
remote.app.on('new-folder-path', () => {
  watcherStarted = false
  watcher.close()
})
function startWatcher(path) {
  return new Promise((resolve, reject) => {
    if (watcherStarted) {
      return resolve(watcher)
    }
    watcherStarted = false
    watcher = chokidar.watch(path, {
      // eslint-disable-next-line no-useless-escape
      ignored: /[\/\\]\./,
      persistent: true,
      ignoreInitial: true
    })

    function onWatcherReady() {
      watcherStarted = true
      Logger.info('File watcher is ready')
      resolve(watcher)
    }

    const rootFolder = path

    // Declare the listeners of the watcher
    watcher
      .on('add', function (path) {
        if (watcherStarted) {
          // Logger.log('File', path, 'has been added')
          database.TempSet(path, 'add')
        }
      })
      .on('addDir', function (path) {
        if (watcherStarted) {
          // Logger.log('Directory', path, 'has been added')
          database.TempSet(path, 'addDir')
        }
      })
      .on('change', function (path) {
        if (watcherStarted) {
          // Logger.log('File', path, 'has been changed')
          database.TempSet(path, 'add')
        }
      })
      .on('unlink', function (path) {
        if (watcherStarted) {
          // Logger.log('File', path, 'has been removed')
          database.TempSet(path, 'unlink')
        }
      })
      .on('unlinkDir', function (path) {
        if (watcherStarted) {
          // Logger.log('Directory', path, 'has been removed')
          if (path === rootFolder) {
            database.ClearAll().then(() => {
              remote.getCurrentWindow().close()
            }).catch(() => {
              remote.getCurrentWindow().close()
            })
          } else {
            database.TempSet(path, 'unlinkDir')
          }
        }
      })
      .on('error', function (error) {
        if (watcherStarted) {
          Logger.log('Watcher error', error)
        }
      })
      .on('ready', onWatcherReady)
      .on('raw', function (event, path, details) {
        // This event should be triggered every time something happens.
        // Logger.log('Raw event info:', event, path, details)
      })
  })
}

export default {
  startWatcher
}
