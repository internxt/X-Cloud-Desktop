import database from '../../database'
import electron from 'electron'
import Logger from '../../libs/logger'
import fs from 'fs'
import SyncProcess from './sync/NewTwoWayUpload'
import ConfigStore from '../../main/config-store'
import analytics from './utils/analytics'
const { app } = require('@electron/remote')

app.on('open-folder', function() {
  database
    .Get('xPath')
    .then(xPath => {
      if (fs.existsSync(xPath)) {
        electron.shell.openPath(xPath)
      } else {
        Logger.log('Error opening root folder from try icon')
      }
    })
    .catch(() => {
      Logger.log('Error opening root folder from try icon')
    })
})
app.on('force-sync', function() {
  analytics
    .track({
      event: 'force-sync',
      userId: undefined,
      properties: {
        storage_used: ConfigStore.get('usage')
      }
    })
    .catch(err => {
      Logger.error(err)
    })
  app.emit('sync-start')
})

app.on('sync-start', function() {
  Monitor(true)
})

function Monitor(startImmediately = false) {
  initMonitor(startImmediately)
}

function repeat() {
  Monitor(true)
}

async function initMonitor(startImmediately = false) {
  // Init database if not initialized
  database.initDatabase()
  SyncProcess.start(repeat, startImmediately)
}

export default {
  Monitor
}
