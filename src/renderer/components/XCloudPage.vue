<template>
  <div id="wrapper">
    <main>
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only"></span>
      </div>
      <div>{{ toolTip ? toolTip : 'Paused' }}</div>
      <div>
        <a href="#" @click="quitApp()">Quit</a>
      </div>
      <div>
        <a href="#" @click="forceSync()">Force sync</a>
      </div>
      <div>
        <a href="#" @click="unlockDevice()">Unlock this device</a>
      </div>
      <div>
        <a href="#" @click="getUsage()">Get usage</a>
      </div>
      <div>
        <a href="#" @click="logout()">Log out</a>
      </div>
      <div>
        <a href="#" @click="mysettooltip()">Tool tip</a>
      </div>
      <div>
        Path:
        <a href="#" @click="openFolder()">{{ this.$data.localPath }}</a>
      </div>
    </main>
  </div>
</template>

<script>
import crypt from '../logic/crypt'
import path from 'path'
import temp from 'temp'
import fs, { existsSync } from 'fs'
import async from 'async'
import database from '../../database'
import Sync from '../logic/sync'
import Uploader from '../logic/uploader'
import Tree from '../logic/tree'
import Monitor from '../logic/monitor'
import Logger from '../../libs/logger'
import PackageJson from '../../../package.json'
import DeviceLock from '../logic/devicelock'
import SpaceUsage from '../logic/utils/spaceusage'
import analytics from '../logic/utils/analytics'
import ConfigStore from '../../../src/main/config-store'
const remote = require('@electron/remote')
var t = ''

export default {
  name: 'xcloud-page',
  data() {
    return {
      databaseUser: '',
      localPath: '',
      currentEnv: '',
      isSyncing: false,
      toolTip: ''
    }
  },
  components: {},
  beforeCreate() {
    remote.app.emit('window-hide')
    SpaceUsage.updateUsage()
      .then(() => {})
      .catch(() => {})
    database
      .Get('xUser')
      .then(xUser => {
        const userEmail = xUser.user.email
        remote.app.emit('update-menu', userEmail)
        Logger.info(
          'Account: %s, User platform: %s %s, version: %s',
          userEmail,
          process.platform,
          process.arch,
          PackageJson.version
        )
      })
      .catch(err => {
        console.log('Cannot update tray icon', err.message)
      })
  },
  beforeDestroy: function() {
    remote.app.removeAllListeners('user-logout')
    remote.app.removeAllListeners('new-folder-path')
    remote.app.removeListener('set-tooltip', this.setTooltip)
  },
  created: function() {
    this.$app = this.$electron.remote.app
    Monitor.Monitor(true)
    this.getLocalFolderPath()
    this.getCurrentEnv()
    remote.app.on('set-tooltip', this.setTooltip)

    remote.app.on('user-logout', () => {
      remote.app.emit('sync-stop')
      database
        .ClearAll()
        .then(() => {
          Logger.info('databases cleared due to log out')
          const localUser = ConfigStore.get('user.uuid')
          database
            .ClearUser()
            .then(() => {
              if (localUser) {
                analytics
                  .track({
                    event: 'user-signout',
                    userId: undefined,
                    platform: 'desktop',
                    properties: {
                      email: 'email'
                    }
                  })
                  .then(() => {
                    analytics.resetUser()
                  })
                  .catch(err => {
                    Logger.error(err)
                  })
              }
              database.compactAllDatabases()
              remote.app.emit('update-menu')
              this.$router.push('/').catch(() => {})
            })
            .catch(err => {
              Logger.error('ERROR CLEARING USER', err)
            })
        })
        .catch(() => {
          Logger.error('ERROR CLEARING ALL')
        })
    })

    remote.app.on('new-folder-path', async newPath => {
      remote.app.emit('sync-stop')
      await database.ClearAll()
      await database.Set('lastSyncSuccess', false)
      database.Set('xPath', newPath)
      this.$router.push('/').catch(() => {})
    })
  },
  methods: {
    quitApp() {
      remote.app.emit('app-close')
    },
    openFolder() {
      remote.app.emit('open-folder')
    },
    logout() {
      remote.app.emit('user-logout')
    },
    forceSync() {
      remote.app.emit('sync-start')
    },
    unlockDevice() {
      DeviceLock.unlock()
    },
    changeTrayIconOn() {
      remote.app.emit('sync-on')
    },
    changeTrayIconOff() {
      remote.app.emit('sync-off')
    },
    getUser() {},
    getUsage() {
      SpaceUsage.getLimit().then(limit => {
        console.log('Limit: ' + limit)
      })
      SpaceUsage.getUsage().then(usage => {
        console.log('Usage: ' + usage)
      })
    },
    getLocalFolderPath() {
      database
        .Get('xPath')
        .then(path => {
          this.$data.localPath = path
        })
        .catch(err => {
          console.error(err)
          this.$data.localPath = 'error'
        })
    },
    mysettooltip() {
      t = t === '' ? 'sadasd' : ''
      remote.app.emit('set-tooltip', t)
    },
    setTooltip(text) {
      this.toolTip = text
    },
    getCurrentEnv() {
      this.$data.currentEnv = process.env.NODE_ENV
    }
  }
}
</script>
