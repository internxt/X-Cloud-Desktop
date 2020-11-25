<template>
  <div id="wrapper">
    <div class="close-button">
      <button @click="closeApp()">
        <img src="~@/../resources/icons/close.png" />
      </button>
    </div>
    <main class="centered-container">
      <div class="login-container-box">
        <div class="login-title">
          <img src="~@/../resources/icons/logo.svg" />
          {{ showTwoFactor ? 'Security Verification' : 'Sign in to Internxt' }}
        </div>
        <div v-if="!showTwoFactor">
          <input
            class="form-control"
            v-model="username"
            type="text"
            placeholder="Email address"
          />
          <input
            class="form-control"
            v-model="password"
            type="password"
            placeholder="Password"
          />
          <!-- <div class="form-control-file">
            <input
              class="form-control"
              v-model="storagePath"
              :disabled="true"
              type="text" placeholder="Select an empty folder" />
            <div class="form-control-fake-file"  @click="selectFolder()"></div>
          </div>-->
          <!-- <p
            v-if="storagePath && !isEmptyFolder(storagePath)"
            class="form-error">
              This folder is not empty
          </p>-->
        </div>
        <div v-if="showTwoFactor">
          <div>Enter your 6 digit authenticator code below</div>
          <input
            class="form-control"
            v-model="twoFactorCode"
            type="text"
            placeholder="Authentication code"
          />
        </div>
        <input
          class="form-control btn-block btn-primary"
          type="submit"
          :disabled="checkForm()"
          @click="doLogin()"
          value="Sign in"
        />

        <div v-if="!showTwoFactor" class="create-account-container">
          Don't have an Internxt account?
          <a href="#" @click="open(`${DRIVE_BASE}/new`)">Get one for free!</a>
        </div>
      </div>
    </main>
    <footer>v{{ version }}</footer>
  </div>
</template>

<script>
import crypt from '../logic/crypt'
import database from '../../database'
import { remote } from 'electron'
import fs from 'fs'
import Logger from '../../libs/logger'
import config from '../../config'
import path from 'path'
import packageConfig from '../../../package.json'

import { client, user } from '../logic/utils/analytics'

const ROOT_FOLDER_NAME = 'Internxt Drive'
const HOME_FOLDER_PATH = remote.app.getPath('home')

export default {
  name: 'login-page',
  beforeCreate() {
    remote.app.emit('window-show')
  },
  data() {
    return {
      username: '',
      password: '',
      showTwoFactor: false,
      twoFactorCode: '',
      isLoading: false,
      DRIVE_BASE: config.DRIVE_BASE,
      version: packageConfig.version
    }
  },
  components: {},
  methods: {
    open(link) {
      this.$electron.shell.openExternal(link)
    },
    // selectFolder () {
    //   const path = remote.dialog.showOpenDialog({ properties: ['openDirectory'] })
    //   if (path && path[0]) {
    //     this.$data.storagePath = path[0]
    //   }
    // },
    isEmptyFolder(path) {
      if (!fs.existsSync(path)) {
        return true
      } else {
        const filesInFolder = fs.readdirSync(path)
        return filesInFolder.length === 0
      }
    },
    checkForm() {
      if (this.$data.isLoading) {
        return true
      }
      return !this.$data.username || !this.$data.password
    },
    // savePathAndLogin () {
    //   database.Set('xPath', this.$data.storagePath).then(() => {
    //     this.doLogin()
    //   }).catch(err => {
    //     this.$data.isLoading = false
    //     Logger.error(err)
    //     alert(err)
    //   })
    // },
    createRootFolder(folderName = ROOT_FOLDER_NAME, n = 0) {
      const rootFolderName = folderName + (n ? ` (${n})` : '')
      const rootFolderPath = path.join(HOME_FOLDER_PATH, rootFolderName)
      const exist = fs.existsSync(rootFolderPath)

      let isEmpty
      if (exist) {
        isEmpty = this.isEmptyFolder(rootFolderPath)
      }

      if (exist && !isEmpty) {
        return this.createRootFolder(folderName, n + 1)
      }

      if (!exist) {
        fs.mkdirSync(rootFolderPath)
      }

      return database.Set('xPath', rootFolderPath)
    },
    doLogin() {
      this.$data.isLoading = true
      fetch(`${process.env.API_URL}/api/login`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: this.$data.username })
      })
        .then(async (res) => {
          return { res, body: await res.json() }
        })
        .then((res) => {
          if (res.res.status !== 200) {
            this.$data.isLoading = false
            return alert('Login error')
          }
          if (res.body.tfa && !this.$data.twoFactorCode) {
            this.$data.showTwoFactor = true
            this.$data.isLoading = false
          } else {
            this.doAccess(res.body.sKey)
          }
        })
        .catch((err) => {
          this.$data.isLoading = false
          Logger.error(err)
        })
    },
    async doAccess(sKey) {
      const salt = crypt.Decrypt(sKey)
      const pwd = crypt.HashPassword(this.$data.password, salt)
      const encryptedHash = crypt.Encrypt(pwd.hash.toString())
      fetch(`${process.env.API_URL}/api/access`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          email: this.$data.username,
          password: encryptedHash,
          tfa: this.$data.twoFactorCode
        })
      })
        .then(async (res) => {
          await client.identify({
            userId: user.getUser().uuid,
            platform: 'desktop',
            traits: {
              email: user.getUser().email,
              storage_used: ''
            }
          }, () => {
            client.track({
              userId: user.getUser().uuid,
              event: 'user-signin',
              platform: 'desktop',
              properties: {
                email: user.getUser().email,
              }
            })
          })
          return { res, data: await res.json() }
        })
        .then(async (res) => {
          if (res.res.status !== 200) {
            this.$data.isLoading = false
            if (res.data.error) {
              alert('Login error\n' + res.data.error)
              if (res.data.error.includes('Wrong email')) {
                console.log('This is an email error')
                this.$data.twoFactorCode = ''
                this.$data.showTwoFactor = false
              }
            } else {
              console.log('Definetly you have an error')
              alert('Login error')
            }
          } else {
            res.data.user.email = this.$data.username.toLowerCase()
            this.createRootFolder()
            await database.Set(
              'xMnemonic',
              crypt.decryptWithKey(res.data.user.mnemonic, this.$data.password)
            )
            await database.Set('xUser', res.data)
            this.$router.push('/landing-page').catch(() => {})
          }
        })
        .catch((err) => {
          Logger.error('Error login', err)
          this.$data.isLoading = false
        })
    },
    closeApp() {
      remote.getCurrentWindow().hide()
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');

@font-face {
  font-family: 'CerebriSans-Regular';
  src: url('../../resources/fonts/CerebriSans-Regular.ttf');
}

#wrapper {
  height: 100%;
  -webkit-app-region: drag;

  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
}

.centered-container {
  -webkit-app-region: no-drag;
  font-family: 'CerebriSans-Regular';
}

.logo {
  width: 50px;
  display: block;
}

.form-control {
  margin-top: 15px;
  height: 50px !important;
}

.btn-primary {
  margin-top: 39px !important;
  background-color: #4585f5 !important;
  font-weight: bold !important;
  outline: none;
}

.btn-primary:disabled {
  border: solid 0px;
}

.login-container-box {
  background-color: #fff;
  width: 472px !important;
  padding: 40px !important;
}

.login-title {
  font-size: 25px;
  font-weight: 600;
  margin-bottom: 20px;
}

.login-title img {
  width: 25px;
  margin-right: 10px;
  margin-bottom: 5px;
}

.create-account-container {
  margin-top: 39px;
  color: #909090;
}

input[type='text']:disabled {
  background-color: white !important;
}

input[type='submit']:disabled {
  background-color: #7aa5ee !important;
}

.form-error {
  color: red;
  font-size: 13px;
  margin: 0px;
}

.close-button {
  align-self: flex-end;
  opacity: 0;
}

.close-button button {
  background-color: transparent;
  border-width: 0px;
}

.close-button button:not(:disabled) {
  cursor: default;
}

.close-button button:focus {
  border-width: 0px;
  outline: none;
}

footer {
  color: #d0d0d0;
  cursor: default;
  font-size: 14px;
  margin: 20px;
}
</style>
