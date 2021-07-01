import async from 'async'
import Logger from '../../../libs/logger'
import Folder from '../folder'
import File from '../file'
import Database from '../../../database'
import DeviceLock from '../devicelock'
import Tree from '../tree'
import PackageJson from '../../../../package.json'
import ConfigStore from '../../../main/config-store'
import SpaceUsage from '../utils/spaceusage'
import NameTest from '../utils/nameTest'
import semver from 'semver'
/*
 * Sync Method: One Way, from LOCAL to CLOUD (Only Upload)
 */

const { app } = require('@electron/remote')

ConfigStore.set('isSyncing', false)
ConfigStore.set('stopSync', false)
ConfigStore.set('updatingDB', false)

var uploadOnlyMode = false
function isUploadOnly() {
  return uploadOnlyMode
}

const wtc = null
let timeoutInstance = null
function syncStop() {
  if (ConfigStore.get('isSyncing')) {
    ConfigStore.set('isSyncing', false)
    ConfigStore.set('stopSync', true)
  }
  app.emit('sync-off', false)
}

async function SyncLogic(callback) {
  let userDevicesSyncing
  try {
    userDevicesSyncing = await DeviceLock.requestSyncLock()
  } catch (e) {
    if (/Failed to fetch/.test(e.message)) {
      app.emit('ui-sync-status', 'error')
    }
    Logger.error(e)
    return
  }
  if (userDevicesSyncing.error) {
    Logger.warn(`Error when try to start sync ${userDevicesSyncing.error}`)
    return start(callback)
  }
  if (userDevicesSyncing.data || ConfigStore.get('isSyncing')) {
    Logger.warn('sync not started: another device already syncing')
    app.emit('ui-sync-status', 'block')
    return start(callback)
  }
  ConfigStore.set('isSyncing', true)
  if (userDevicesSyncing.ensure !== undefined) {
    File.setEnsureMode(
      userDevicesSyncing.ensure,
      userDevicesSyncing.probability
    )
  } else {
    File.setEnsureMode(0)
  }
  if (userDevicesSyncing.fullReset) {
    await Database.ClearAll()
  }
  if (semver.gt(PackageJson.version, ConfigStore.get('version'))) {
    await Database.ClearAll()
    ConfigStore.set('version', PackageJson.version)
  }
  Logger.info('Sync started IsUploadOnly? ', ConfigStore.get('uploadOnly'))
  DeviceLock.startUpdateDeviceSync()
  app.once('sync-stop', syncStop)
  app.once('user-logout', DeviceLock.stopUpdateDeviceSync)
  app.emit('ui-sync-status', 'pending')
  ConfigStore.set('isSyncing', true)
  if (ConfigStore.get('uploadOnly')) {
    uploadOnlyMode = true
  } else {
    const force = ConfigStore.get('forceUpload')
    if (force === 2) {
      ConfigStore.set('forceUpload', 1)
      uploadOnlyMode = true
    } else if (force === 1) {
      uploadOnlyMode = true
    } else {
      uploadOnlyMode = false
    }
  }
  const syncComplete = async function(err) {
    if (err) {
      Logger.error('Error sync monitor:', err.message ? err.message : err)
      if (/it violates the unique constraint/.test(err.message)) {
        Tree.tryFixDuplicateFolder()
        Logger.log('sending request for rename duplicate folder')
      }
      if (/stop sync/.test(err.message)) {
        app.emit('ui-sync-status', 'stop')
      } else {
        app.emit('ui-sync-status', 'error')
      }
    } else {
      if (ConfigStore.get('forceUpload') === 1) {
        ConfigStore.set('forceUpload', 0)
      }
      app.emit('ui-sync-status', 'success')
    }
    // console.timeEnd('desktop')
    const basePath = await Database.Get('xPath')
    NameTest.removeTestFolder(basePath)
    app.emit('set-tooltip')
    app.emit('sync-off', false)
    app.removeListener('sync-stop', syncStop)
    app.removeListener('user-logout', DeviceLock.stopUpdateDeviceSync)
    ConfigStore.set('stopSync', false)
    DeviceLock.stopUpdateDeviceSync()
    ConfigStore.set('isSyncing', false)
    const rootFolderExist = await Folder.rootFolderExists()
    if (!rootFolderExist) {
      app.emit('user-logout')
      return
    }
    Logger.info('SYNC END')
    SpaceUsage.updateUsage()
      .then(() => {})
      .catch(() => {})
    if (err) {
      Logger.error('Error monitor:', err)
    }
    start(callback)
  }

  async.waterfall(
    [
      next => {
        app.emit('sync-on', true)
        app.emit('set-tooltip', 'Checking root folder')
        Folder.rootFolderExists()
          .then(exists =>
            next(exists ? null : Error('root folder does not exist'))
          )
          .catch(next)
      },
      next => {
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // New sync started, so we save the current date
        const now = new Date()
        Logger.log('Sync started at', now.toISOString())
        Database.Set('syncStartDate', now)
          .then(() => next())
          .catch(next)
      },
      next => {
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        app.emit('set-tooltip', 'Updating user info')
        Database.Get('xUser')
          .then(user => {
            if (!user.user.bucket) {
              Tree.updateUserObject()
                .then(next)
                .catch(next)
            } else {
              next()
            }
          })
          .catch(next)
      },
      next => {
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // Sync and update the remote tree.
        app.emit('set-tooltip', 'Updating cloud folders and files')
        Logger.log('Updating cloud folders and files')
        // console.time('desktop')
        // console.time('update list')
        Tree.updateDbAndCompact()
          .then(() => next())
          .catch(next)
      },
      next => {
        app.emit('set-tooltip', 'Checking slective sync')
        Logger.log('Checking slective sync')
        Folder.checkSelectiveSync()
          .then(() => next())
          .catch(next)
      },
      next => {
        // console.timeEnd('update list')
        // console.time('sincronizar Local folder')
        app.emit('set-tooltip', 'Checking local folders')
        Logger.log('Checking local folders')
        Folder.sincronizeLocalFolder()
          .then(() => next())
          .catch(next)
      },
      next => {
        // console.timeEnd('sincronizar Local folder')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('sincronizar Local files')
        app.emit('set-tooltip', 'Checking local files')
        Logger.log('Checking local files')
        File.sincronizeLocalFile()
          .then(() => next())
          .catch(next)
      },
      next => {
        // console.timeEnd('sincronizar Local files')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('sincronizar cloud folder')
        app.emit('set-tooltip', 'Checking cloud folders')
        Logger.log('Checking cloud folders')
        Folder.sincronizeCloudFolder()
          .then(next)
          .catch(next)
      },
      next => {
        // console.timeEnd('sincronizar cloud folder')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('sincronizar cloud files')
        app.emit('set-tooltip', 'Checking cloud files')
        Logger.log('Checking cloud files')
        File.sincronizeCloudFile()
          .then(next)
          .catch(next)
      },
      next => {
        // console.timeEnd('sincronizar cloud files')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('crearFolder')
        app.emit('set-tooltip', 'Creating folders')
        Logger.log('Creating folders')
        Folder.createFolders()
          .then(next)
          .catch(next)
      },
      next => {
        // console.timeEnd('crearFolder')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('sincronizeFile')
        app.emit('set-tooltip', 'Synchronizing files')
        Logger.log('Synchronizing files')
        File.sincronizeFile()
          .then(next)
          .catch(next)
      },
      next => {
        // console.timeEnd('sincronizeFile')
        if (ConfigStore.get('stopSync')) {
          next('stop sync')
        } else {
          next()
        }
      },
      next => {
        // console.time('removeFolders')
        app.emit('set-tooltip', 'Remove folders')
        Logger.log('Remove folders')
        Folder.removeFolders()
          .then(next)
          .catch(next)
      }
    ],
    syncComplete
  )
}

function start(callback, startImmediately = false) {
  const isSyncing = ConfigStore.get('isSyncing')
  if (isSyncing) {
    return Logger.warn('There is an active sync running right now')
  }
  Logger.info('Start sync')
  let timeout = 0
  if (!startImmediately) {
    timeout = process.env.NODE_ENV !== 'production' ? 1000 * 30 : 1000 * 60 * 10
  }
  if (!isSyncing) {
    clearTimeout(timeoutInstance)
    Logger.log(
      'Waiting %s secs for next sync. Version: v%s',
      timeout / 1000,
      PackageJson.version
    )
    timeoutInstance = setTimeout(() => SyncLogic(callback), timeout)
  }
}

function end() {
  clearInterval(timeoutInstance)
}

export default {
  start,
  end,
  isUploadOnly
}
