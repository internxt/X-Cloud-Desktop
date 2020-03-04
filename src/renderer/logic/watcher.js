import chokidar from 'chokidar'
import database from '../../database/index'
import Logger from '../../libs/logger'

function StartWatcher(path) {
  var watcher = chokidar.watch(path, {
    // eslint-disable-next-line no-useless-escape
    ignored: /[\/\\]\./,
    persistent: true
  })

  function onWatcherReady() {
    Logger.info(
      'From here can you check for real changes, the initial scan has been completed.'
    )
  }

  // Declare the listeners of the watcher
  watcher.on('add', function (path) {
    Logger.log('File', path, 'has been added')
    database.TempSet(path, 'add')
  }).on('addDir', function (path) {
    Logger.log('Directory', path, 'has been added')
    database.TempSet(path, 'addDir')
  }).on('change', function (path) {
    Logger.log('File', path, 'has been changed')
    database.TempSet(path, 'add')
  }).on('unlink', function (path) {
    Logger.log('File', path, 'has been removed')
    database.TempSet(path, 'unlink')
  }).on('unlinkDir', function (path) {
    Logger.log('Directory', path, 'has been removed')
    database.TempSet(path, 'unlinkDir')
  })
    .on('error', function (error) {
      Logger.log('Error happened', error)
    })
    .on('ready', onWatcherReady)
    .on('raw', function (event, path, details) {
      // This event should be triggered everytime something happens.
      // Logger.log('Raw event info:', event, path, details)
    })

  return watcher
}

export default {
  StartWatcher
}
