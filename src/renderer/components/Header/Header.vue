<template>
  <div class="overflow-hidden">
    <div
      class="flex justify-between items-start p-4"
      style="-webkit-app-region: drag"
    >
      <div class="flex flex-col" style="-webkit-app-region: no-drag;">
        <div @click="CloseModals()" class="flex items-center cursor-pointer">
          <img src="../../assets/svg/brand-app.svg" />
          <div class="text-xs text-gray-500 ml-2">
            <div class="">{{ emailAccount }}</div>
            <div class="flex" v-if="showUsage">
              <div class="mr-0.5 text-gray-500 text-xs">{{ usage }} of</div>
              <div class="text-blue-500 text-xs italic">{{ limit }}</div>
              <div v-if="this.showUpgrade" class="ml-2 text-blue-600">
                <a @click="openLinkBilling()">Upgrade</a>
              </div>
            </div>
          </div>

          <!-- <InternxtBrand :width="16" :height="16"/> -->
          <!-- <div class="text-gray-800 text-xl font-extrabold ml-1.5">{{ appName }}</div> -->
        </div>
      </div>

      <div
        class="flex items-center justify-center"
        style="-webkit-app-region: no-drag;"
      >
        <!-- {{ this.$data.localPath }} -->
        <div
          v-if="!isProduction"
          class="mr-3 cursor-pointer"
          @click="ShowDevModal()"
          v-tooltip="{
            content: 'Dev Mode',
            placement: 'bottom',
            delay: { show: 300, hide: 300 }
          }"
        >
          <UilSlidersVAlt class="text-blue-600" size="24px" />
        </div>

        <div
          class="mr-3 cursor-pointer"
          @click="openFolder()"
          v-tooltip="{
            content: 'Sync folder',
            placement: 'bottom',
            delay: { show: 300, hide: 300 }
          }"
        >
          <UilFolderOpen class="text-blue-600" size="24px" />
        </div>

        <div
          class="cursor-pointer mr-3"
          v-on:click="ShowSettingsModal()"
          v-tooltip="{
            content: 'Settings',
            placement: 'bottom',
            delay: { show: 300, hide: 300 }
          }"
        >
          <UilSetting class="text-blue-600" size="24px" />
        </div>

        <div
          class="cursor-pointer mr-3"
          v-on:click="ShowAccountModal()"
          v-tooltip="{
            content: 'Account',
            placement: 'bottom',
            delay: { show: 300, hide: 300 }
          }"
        >
          <UilUserCircle class="text-blue-600" size="24px" />
        </div>
      </div>
    </div>

    <!-- Modal settings -->
    <transition
      enter-class="enter"
      enter-to-class="enter-to"
      enter-active-class="slide-enter-active"
      leave-class="leave"
      leave-to-class="leave-to"
      leave-active-class="slide-leave-active"
    >
      <div
        v-if="showSettingsModal === true"
        class="bg-white p-4 px-6 w-full h-full fixed rounded-t-2xl z-10"
      >
        <div class="flex justify-between">
          <div class="text-black text-base font-bold mb-3">Configuration</div>

          <div class="cursor-pointer" v-on:click="CloseSettingsModal()">
            <UilMultiply class="mr-2 text-blue-600" />
          </div>
        </div>

        <span class="text-sm text-black">Sync mode</span>
        <form class="mt-2 mb-2">
          <div
            @click="OpenSyncSettingsModal(false)"
            class="radioContainer ml-2"
          >
            <p class="text-xs text-gray-500 hover:text-blue-500 cursor-pointer">
              Full sync
            </p>
            <input type="radio" name="radio" :checked="!CheckedValue" />
            <span class="checkmark"></span>
            <span class="smallCheckmark"></span>
          </div>

          <div
            @click="OpenSyncSettingsModal(true)"
            class="radioContainer mt-1 ml-2"
          >
            <p
              class="text-xs text-gray-500 hover:text-blue-500 cursor-pointer pt-0.5"
            >
              Upload only
            </p>
            <input type="radio" name="radio" :checked="CheckedValue" />
            <span class="checkmark mt-0.5"></span>
            <span class="smallCheckmark mt-0.5"></span>
          </div>
        </form>
        <!-- <span class="text-xs bg-blue-600 p-1.5 rounded-full text-white px-3 cursor-pointer hover:bg-blue-800" @click="stopSync()">Stop sync</span> -->

        <div class="text-sm mt-3">Change sync folder</div>
        <div class="flex items-center mt-2">
          <div class="flex items-center">
            <div><UilFolderOpen class="text-blue-600 mr-2 mt-0.5" /></div>
            <p class="text-xs text-gray-500 break-words w-72">
              {{ this.path }}
            </p>
          </div>
          <div
            v-on:click="changeFolder()"
            class="text-sm text-blue-600 ml-8 cursor-pointer"
          >
            Change
          </div>
        </div>

        <label class="checkbox mt-3">
          <input
            type="checkbox"
            :checked="LaunchCheck"
            v-on:change="launchAtLogin()"
          />
          <span class="ml-2 text-gray-700">Launch at login</span>
        </label>
      </div>
    </transition>

    <!-- Modal Account -->
    <transition
      enter-class="enter"
      enter-to-class="enter-to"
      enter-active-class="slide-enter-active"
      leave-class="leave"
      leave-to-class="leave-to"
      leave-active-class="slide-leave-active"
    >
      <div
        v-if="showAccountModal === true"
        class="bg-white p-4 px-6 w-full h-full fixed rounded-t-2xl z-10"
      >
        <div class="flex justify-between">
          <div class="text-black text-base font-bold mb-3">Account</div>
          <div class="cursor-pointer" v-on:click="CloseAccountModal()">
            <UilMultiply class="mr-2 text-blue-600" />
          </div>
        </div>

        <div class="text-sm hover:text-blue-600 cursor-pointer mb-3">
          <a @click="openLinkBilling()">Billing</a>
        </div>

        <div
          v-on:click="openLogs()"
          class="text-sm mb-3 hover:text-blue-600 cursor-pointer"
        >
          Open logs
        </div>
        <div
          v-on:click="ContactSupportMailto()"
          class="text-sm hover:text-blue-600 cursor-pointer mb-3"
        >
          Contact support
        </div>
        <div
          class="text-sm mb-3 hover:text-blue-600 cursor-pointer"
          @click="logout()"
        >
          Log out
        </div>
        <div
          class="text-sm hover:text-blue-600 cursor-pointer"
          @click="quitApp()"
        >
          Quit
        </div>
      </div>
    </transition>

    <transition
      enter-class="enter"
      enter-to-class="enter-to"
      enter-active-class="slide-enter-active"
      leave-class="leave"
      leave-to-class="leave-to"
      leave-active-class="slide-leave-active"
    >
      <div
        v-if="showDevTools === true"
        class="bg-white p-4 px-6 w-full h-full fixed rounded-t-2xl z-10"
      >
        <div class="flex justify-between">
          <div class="text-black text-base font-bold mb-3">Dev Mode</div>
          <div class="cursor-pointer" v-on:click="CloseDevModal()">
            <UilMultiply class="mr-2 text-blue-600" />
          </div>
        </div>

        <div>
          <a class="btn btn-blue" @click="UnlockDevice()">
            Unlock device
          </a>
        </div>
        <div>
          <input v-model="message" placeholder="path" />
          <select v-model="message2">
            <option disabled value="">select</option>
            <option>SELECT</option>
            <option>DESELECT</option>
          </select>
          <a class="btn btn-blue" @click="setTrie(message, message2)">
            set
          </a>
        </div>
        <!-- <div>
          <a
            class="btn btn-blue"
            @click="stopSync()"
          >
            Stop sync
          </a>
        </div> -->

        <a
          class="btn btn-blue"
          @click="
            () => {
              console.log('HOLA')
            }
          "
        >
          Log out
        </a>
      </div>
    </transition>
    <div
      v-if="showSyncSettingsModal && selectedSyncOption === false"
      class="absolute top-0 left-0 z-20 bg-blue-600 bg-opacity-90 h-full w-full flex flex-col justify-center items-center text-white"
    >
      <h1 class="text-lg text-white font-bold">Attention</h1>
      <p class="text-base text-center w-72 mt-3">
        By changing to full sync you will start synchronizing all your content.
        The next sync will be Upload only to ensure your files.
      </p>

      <div class="mt-4">
        <button
          @click="CloseSyncSettingsModal()"
          class="text-sm mr-5 cursor-pointer focus:outline-none"
        >
          Cancel
        </button>
        <button
          @click="syncModeChange()"
          class="w-24 py-2 rounded-full bg-white font-semibold text-sm text-blue-600 cursor-pointer focus:outline-none"
        >
          Accept
        </button>
      </div>

      <!-- <a href="" class="text-xs underline mt-4 cursor-pointer">Know more about Full Sync</a> -->
    </div>

    <div
      v-if="showSyncSettingsModal && selectedSyncOption === true"
      class="absolute top-0 left-0 z-20 bg-blue-600 bg-opacity-90 h-full w-full flex flex-col justify-center items-center text-white"
    >
      <h1 class="text-lg text-white font-bold">Attention</h1>
      <p class="text-base text-center w-72 mt-3">
        By changing to upload only mode you will be able to delete files locally
        whithout losing them from your cloud. This option is perfect for
        backups.
      </p>

      <div class="mt-4">
        <button
          @click="CloseSyncSettingsModal()"
          class="text-sm mr-5 cursor-pointer focus:outline-none"
        >
          Cancel
        </button>
        <button
          @click="syncModeChange()"
          value="full"
          class="w-24 py-2 rounded-full bg-white font-semibold text-sm text-blue-600 cursor-pointer focus:outline-none"
        >
          Accept
        </button>
      </div>

      <!-- <a href="" class="text-xs underline mt-4 cursor-pointer">Know more about Full Sync</a> -->
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import '../Header/Header.scss'
import fs from 'fs-extra'
import {
  UilFolderNetwork,
  UilSetting,
  UilUserCircle,
  UilMultiply,
  UilFolderOpen,
  UilServerConnection,
  UilFileTimes,
  UilSlidersVAlt
} from '@iconscout/vue-unicons'
import 'ant-design-vue/dist/antd.css'
import InternxtBrand from '../ExportIcons/InternxtBrand'
import database from '../../../database/index'
import FileLogger from '../../logic/FileLogger'
import Monitor from '../../logic/monitor'
import ConfigStore from '../../../main/config-store'
import analytics from '../../logic/utils/analytics'
import Logger from '../../../libs/logger'
import path from 'path'
import electronLog from 'electron-log'
import VToolTip from 'v-tooltip'
import DeviceLock from '../../logic/devicelock'
import bytes from 'bytes'
import SelectMiddleware from '../../logic/selectiveSyncMiddleware'

Vue.use(VToolTip)
const remote = require('@electron/remote')

export default {
  data() {
    return {
      placement: 'left',
      showSettingsModal: false,
      isProduction: process.env.NODE_ENV === 'production',
      showAccountModal: false,
      showDevTools: false,
      localPath: '',
      LaunchCheck: ConfigStore.get('autoLaunch'),
      selectedSyncOption: 'none',
      path: null,
      msg: 'Mensaje de texto',
      usage: '',
      limit: '',
      CheckedValue: ConfigStore.get('uploadOnly'),
      showSyncSettingsModal: false,
      console: console,
      showUpgrade: false,
      showUsage: false,
      selectOption: SelectMiddleware.selectAction
    }
  },
  beforeCreate: function() {
    database.Get('xPath').then(path => {
      this.$data.path = path
    })
  },
  beforeDestroy: function() {
    remote.app.removeAllListeners('user-logout')
    remote.app.removeAllListeners('update-storage')
    remote.app.removeAllListeners('update-last-entry')
    remote.app.removeAllListeners('new-folder-path')
  },
  created: function() {
    this.$app = this.$electron.remote.app
    // Storage and space used
    remote.app.on('update-storage', data => {
      this.usage = data.usage
      this.limit = data.limit
      if (this.usage && this.limit) {
        this.showUpgrade = bytes.parse(this.limit) < 2199023255552
        this.showUsage = true
      }
    })
    FileLogger.on('update-last-entry', item => {
      this.file = item
    })
    Monitor.Monitor(true)
    remote.app.on('user-logout', async (saveData = false) => {
      remote.app.emit('sync-stop')
      await database.logOut(saveData)
      analytics
        .track({
          event: 'user-signout',
          userId: undefined,
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
      this.$router.push('/').catch(() => {})
    })

    remote.app.on('new-folder-path', async newPath => {
      remote.app.emit('sync-stop')
      await database.ClearAll()
      await database.Set('lastSyncSuccess', false)
      database.Set('xPath', newPath)
      remote.app.emit('window-pushed-to', '/xcloud')
      this.$router.push('/xcloud').catch(() => {})
    })
  },
  updated: function() {},
  methods: {
    debug() {},
    openLinkBilling() {
      remote.shell.openExternal('https://drive.internxt.com/storage')
    },
    // Log out - save folder path whe user log out
    stopSync() {
      remote.app.emit('sync-stop')
    },
    logout() {
      remote.dialog
        .showMessageBox(remote.getCurrentWindow(), {
          type: 'question',
          buttons: ['Yes', 'No'],
          default: 1,
          cancelId: 1,
          title: 'Dialog',
          message:
            'Would you like to remember where your sync folder is the next time you log in?'
        })
        .then(userResponse => {
          if (userResponse.response === 0) {
            remote.app.emit('user-logout', true)
          } else {
            remote.app.emit('user-logout', false)
          }
        })
    },
    // Quit
    quitApp() {
      remote.app.emit('sync-stop')
      remote.app.emit('app-close')
    },
    CloseModals() {
      this.showSettingsModal = false
      this.showAccountModal = false
      this.showDevTools = false
    },
    ShowDevModal() {
      this.CloseModals()
      this.showDevTools = true
    },
    CloseDevModal() {
      this.showDevTools = false
    },
    // Open modal account
    ShowAccountModal() {
      this.CloseModals()
      this.showAccountModal = !this.showAccountModal
    },
    // Close modal account
    CloseAccountModal() {
      this.showAccountModal = false
    },
    // Open modal Settings
    ShowSettingsModal() {
      this.CloseModals()
      this.showSettingsModal = !this.showSettingsModal
    },
    // Close Modal Settings
    CloseSettingsModal() {
      this.showSettingsModal = false
    },
    OpenSyncSettingsModal(syncOption) {
      if (this.CheckedValue !== syncOption) {
        this.selectedSyncOption = syncOption
        this.showSyncSettingsModal = true
      }
    },
    CloseSyncSettingsModal() {
      this.showSyncSettingsModal = false
    },
    // Open folder path
    openFolder() {
      remote.app.emit('open-folder')
    },
    // Launch folder path
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
    // Change folder
    changeFolder() {
      const newDir = remote.dialog.showOpenDialogSync({
        properties: ['openDirectory']
      })
      if (newDir && newDir.length > 0 && fs.existsSync(newDir[0])) {
        if (newDir[0] === remote.app.getPath('home')) {
          remote.app.emit(
            'show-error',
            'Internxt do not support syncronization of your home directory. Try to sync any of its content instead.'
          )
          return
        }
        const appDir = /linux/.test(process.platform)
          ? remote.app.getPath('appData')
          : path.dirname(remote.app.getPath('appData'))
        const relative = path.relative(appDir, newDir[0])
        if (
          (relative &&
            !relative.startsWith('..') &&
            !path.isAbsolute(relative)) ||
          appDir === newDir[0]
        ) {
          remote.app.emit(
            'show-error',
            'Internxt do not support syncronization of your appData directory or anything inside of it.'
          )
          return
        }
        this.path = newDir[0]
        remote.app.emit('new-folder-path', newDir[0])
      } else {
        Logger.info('Sync folder change error or cancelled')
      }
    },
    // Full sync - Upload only Sync mode
    syncModeChange() {
      if (this.selectedSyncOption === false) {
        remote.app.emit('update-configStore', { forceUpload: 2 })
        remote.app.emit('update-configStore', { uploadOnly: false })
        this.CheckedValue = false
      } else {
        remote.app.emit('update-configStore', { uploadOnly: true })
        this.CheckedValue = true
      }
      this.showSyncSettingsModal = false
      this.stopSync()
    },
    // Open logs
    openLogs() {
      try {
        const logFile = electronLog.transports.file.getFile().path
        const logPath = path.dirname(logFile)
        remote.shell.openPath(logPath)
      } catch (e) {
        Logger.error('Error opening log path: %s', e.message)
      }
    },
    // Launch at login
    launchAtLogin() {
      this.LaunchCheck = !this.LaunchCheck
      remote.app.emit('update-configStore', { autoLaunch: this.LaunchCheck })
      remote.app.emit('change-auto-launch', this.LaunchCheck)
    },
    // Contact support
    ContactSupportMailto() {
      if (process.platform === 'linux') {
        remote.app.emit('show-info', 'email: hello@internxt.com')
      } else {
        remote.shell.openExternal(
          `mailto:hello@internxt.com?subject=Support Ticket&body=If you want to upload log files to our tech teams. Please, find them on the Open Logs option in the menu.`
        )
      }
    },
    UnlockDevice() {
      DeviceLock.unlock()
      // Unlock ui
      remote.app.emit('ui-sync-status', 'default')
    },
    setTrie(path, action) {
      if (action === 'SELECT') {
        SelectMiddleware.setTrie(path, SelectMiddleware.selectAction.SELECT)
      } else {
        SelectMiddleware.setTrie(path, SelectMiddleware.selectAction.DESELECT)
      }
    }
  },
  name: 'Header',
  props: {
    appName: {
      type: String,
      default: 'Internxt'
    },
    emailAccount: {
      type: String,
      default: 'Aplication'
    },
    IconClass: {
      type: String,
      default: ''
    }
  },
  components: {
    UilSetting,
    UilUserCircle,
    UilFolderNetwork,
    InternxtBrand,
    UilMultiply,
    UilFolderOpen,
    UilServerConnection,
    UilFileTimes,
    UilSlidersVAlt
  }
}
</script>
