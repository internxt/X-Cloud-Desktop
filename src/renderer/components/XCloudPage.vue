<template>
  <div class="bg-cool-gray-10">
    <div class="text-cool-gray-90"></div>
    <!-- <SettingsModal ref="settingsModal"/> -->

  <!-- This Modal must move to /src/renderer/components/Modals/SettingsModal/ once onclick starts working -->
  <div @parentPopme="popTimeline">
    <!-- For now, to be able to see the modal change the v-if to true -->
    <div v-if="isOpen" class="bg-white absolute bottom-0 w-full h-48 mb-24 py-4 px-6 rounded-t-2xl">
      <div class="flex justify-between">
        <span class="subTitle">Account</span>

        <span>x</span>
      </div>

      <div class="flex flex-col h-full justify-start">
        <span class="mt-3">Open logs</span>
        <span class="mt-2">Contact support</span>
        <span class="mt-2">Log out</span>
        <span class="mt-2">Quit</span>
      </div>
    </div>
</div>
  <Header :appName="appName" :SubtitleApp="SubtitleApp" />
  <FileStatus />
  <SyncButtonAction />

    <!-- <div id="selectSyncPanel">
        <input type="checkbox" id="carpeta1" checked="false" />
      </div>

      <div>{{ toolTip ? toolTip : 'Paused' }}</div>
      <div>
        <a href="#" @click="quitApp()">Quitttt</a>
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
        <a href="#" @click="stopSync()">Stop Sync</a>
      </div>
      <div>
        Path:
        <a href="#" @click="openFolder()">{{ this.$data.localPath }}</a>
      </div> -->
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
import Header from '../components/Header/Header'
import FileStatus from '../components/FileStatus//FileStatus'
import SettingsModal from '../components/Modals/SettingsModal/SettingsModal'
import SyncButtonAction from '../components/SyncButtonAction/SyncButtonAction'
import FileLogger from '../logic/FileLogger'

window.FileLogger = FileLogger
window.resizeTo(400, 400)

FileLogger.on('new-entry', (item) => console.log(item))

const remote = require('@electron/remote')
var t = ''

// Uncomment for notification testing
// Notification.on('ui-update', (e) => console.log(e))

export default {
  name: 'xcloud-page',
  components: {
    Header,
    FileStatus,
    SyncButtonAction,
    SettingsModal
  },

  data() {
    return {
      databaseUser: '',
      localPath: '',
      currentEnv: '',
      isSyncing: false,
      toolTip: '',
      appName: 'Drive',
      SubtitleApp: 'hello@internxt.com',
      IconClass: 'prueba',
      isOpen: false
    }
  },

  beforeCreate() {
    remote.app.emit('window-hide')
    SpaceUsage.updateUsage()
      .then(() => {})
      .catch(() => {})
    database
      .Get('xUser')
      .then((xUser) => {
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
      .catch((err) => {
        console.log('Cannot update tray icon', err.message)
      })
  },
  beforeDestroy: function () {
    remote.app.removeAllListeners('user-logout')
    remote.app.removeAllListeners('new-folder-path')
    remote.app.removeListener('set-tooltip', this.setTooltip)
  },
  created: function () {
    this.$app = this.$electron.remote.app
    Monitor.Monitor(true)
    this.getLocalFolderPath()
    this.getCurrentEnv()
    remote.app.on('set-tooltip', this.setTooltip)

    remote.app.on('user-logout', async (saveData = false) => {
      remote.app.emit('sync-stop')
      await database.logOut(saveData)
      const localUser = ConfigStore.get('user.uuid')
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
          .catch((err) => {
            Logger.error(err)
          })
      }
      remote.app.emit('update-menu')
      this.$router.push('/').catch(() => {})
    })

    remote.app.on('new-folder-path', async (newPath) => {
      remote.app.emit('sync-stop')
      await database.ClearAll()
      await database.Set('lastSyncSuccess', false)
      database.Set('xPath', newPath)
      this.$router.push('/').catch(() => {})
    })
  },
  methods: {
    popTimeline(val) {
      console.log('llega')
      this.isOpen = !this.isOpen
    },
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
    stopSync() {
      remote.app.emit('sync-stop')
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
      SpaceUsage.getLimit().then((limit) => {
        console.log('Limit: ' + limit)
      })
      SpaceUsage.getUsage().then((usage) => {
        console.log('Usage: ' + usage)
      })
    },
    getLocalFolderPath() {
      database
        .Get('xPath')
        .then((path) => {
          this.$data.localPath = path
        })
        .catch((err) => {
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
