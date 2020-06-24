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
        <a href="#" @click="logout()">Log out</a>
      </div>
      <div>
        Path:
        <a href="#" @click="openFolder()">{{this.$data.localPath}}</a>
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
import { remote } from 'electron'
import Logger from '../../libs/logger'
import PackageJson from '../../../package.json'
import GetInstance from '../../libs/database'

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
    console.log('before create')
    remote.app.emit('window-show')
    Logger.info('User platform: %s %s, version: %s', process.platform, process.arch, PackageJson.version)
  },
  created: function() {
    this.$app = this.$electron.remote.app
    this.getLocalFolderPath()
    this.getCurrentEnv()
  },
  methods: {
    quitApp() {
      remote.getCurrentWindow().close()
    },
    openFolder() {
      remote.app.emit('open-folder')
    },
    forceSync() {
      remote.app.emit('sync-start')
    },
    changeTrayIconOn() {
      remote.app.emit('sync-on')
    },
    changeTrayIconOff() {
      remote.app.emit('sync-off')
    },
    getUser() {},
    getLocalFolderPath() {
    },
    getCurrentEnv() {
      this.$data.currentEnv = process.env.NODE_ENV
    },
    logout() {
      GetInstance().then(conn => {
        conn.User.find().then(result => {
          console.log(result)
        })
        conn.clearAll().then(() => {
          this.$router.push('/')
        })
      }).catch(err => {
        alert('Error logging out: ' + err.message)
      })
    }
  }
}
</script>