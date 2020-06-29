<template>
  <div id="wrapper">
    <nav class="navbar navbar-expand-lg navbar-light">
      <div></div>
      <button
        class="navbar-toggler"
        type="button"
        data-toggle="collapse"
        data-target="#navbarNavDropdown"
        aria-controls="navbarNavDropdown"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNavDropdown">
        <ul class="navbar-nav">
          <li class="nav-item active">
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" @click="logout()">Log out</a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" @click="quitApp()">Close</a>
          </li>
        </ul>
      </div>
    </nav>
    <main>
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only"></span>
      </div>
      <div>{{ toolTip ? toolTip : 'Paused' }}</div>
      <div>
        <a href="#" @click="forceSync()">Force sync</a>
      </div>
      <div>
        Tray icon:
        <a href="#" @click="changeTrayIconOn()">on</a> -
        <a href="#" @click="changeTrayIconOff()">off</a>
      </div>
      <div>
        Path:
        <a href="#" @click="openFolder()">{{this.$data.localPath}}</a>
      </div>
<div class="form-check form-check-inline">
  <input class="form-check-input" type="radio" name="inlineRadioOptions" id="inlineRadio1" value="option1">
  <label class="form-check-label" for="inlineRadio1">1</label>
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
import { remote, dialog } from 'electron'
import Logger from '../../libs/logger'
import PackageJson from '../../../package.json'
import GetInstance from '../../libs/database'
import OneWayUpload from '../../libs/sync/OneWayUpload'
import Credentials from '../../libs/sync/utils/Credentials'

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
    remote.app.emit('window-show')
    Logger.info(
      'User platform: %s %s, version: %s',
      process.platform,
      process.arch,
      PackageJson.version
    )
  },
  created: async function() {
    this.$app = this.$electron.remote.app
    this.getLocalFolderPath()
    this.getCurrentEnv()
    await Credentials.init()
    this.localPath = Credentials.path

    // One Way Upload
    const sync = new OneWayUpload()
    sync.init().then(() => {
      sync.start()
    })
  },
  methods: {
    quitApp() {
      remote.getCurrentWindow().close()
    },
    openFolder() {
      remote.app.emit('open-item', Credentials.path)
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
    getLocalFolderPath() {},
    getCurrentEnv() {
      this.$data.currentEnv = process.env.NODE_ENV
    },
    async logout() {
      GetInstance()
        .then(conn => {
          conn.clearAll().then(() => {
            this.$router.push('/')
          })
        })
        .catch(err => {
          alert('Error logging out: ' + err.message)
        })
    }
  }
}
</script>

<style lang="scss">
.navbar {
  position: absolute !important;
  right: 0px;
}
.navbar-brand {
  width: 20px;
}
.navbar-collapse {
  background-color: #fafafa;
  padding: 10px;
  border-radius: 10px;
}

.navbar-toggler:focus {
  outline: none;
}

</style>
