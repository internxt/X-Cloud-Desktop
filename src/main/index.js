'use strict'

import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  shell,
  dialog,
  powerMonitor
} from 'electron'
import path from 'path'
import Logger from '../libs/logger'
import AutoLaunch from '../libs/autolauncher'
import { autoUpdater } from 'electron-updater'
import semver from 'semver'
import PackageJson from '../../package.json'
import fetch from 'electron-fetch'
import fs from 'fs'
import ConfigStore from './config-store'
import TrayMenu from './traymenu'
require('@electron/remote/main').initialize()
AutoLaunch.configureAutostart()

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */

if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow, tray, trayMenu

const winURL =
  process.env.NODE_ENV === 'development'
    ? `http://localhost:9080`
    : `file://${__dirname}/index.html`

if (process.platform === 'darwin' && process.env.NODE_ENV !== 'development') {
  app.dock.hide()
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
}

app.on('update-menu', user => {
  if (trayMenu) {
    trayMenu.updateContextMenu(user)
  } else {
    Logger.error('No tray to update')
  }
})

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: process.env.NODE_ENV !== 'development',
      enableRemoteModule: true
    },
    width: 500,
    height: 550,
    useContentSize: true,
    frame: process.env.NODE_ENV === 'development',
    autoHideMenuBar: true,
    skipTaskbar: process.env.NODE_ENV !== 'development',
    show: process.env.NODE_ENV === 'development',
    resizable: false,
    menuBarVisible: false
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', appClose)
  mainWindow.on('close', appClose)

  app.on('app-close', appClose)

  const edit = {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: function () {
          self.getWindow().webContents.undo()
        }
      },
      {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Y',
        click: function () {
          self.getWindow().webContents.redo()
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        click: function () {
          self.getWindow().webContents.cut()
        }
      },
      {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: function () {
          self.getWindow().webContents.copy()
        }
      },
      {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: function () {
          self.getWindow().webContents.paste()
        }
      },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: function () {
          self.getWindow().webContents.selectAll()
        }
      }
    ]
  }

  const editMacOS = {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' }
    ]
  }

  const view = {
    label: 'View',
    submenu: [
      {
        label: 'Developer Tools',
        accelerator: 'Shift+CmdOrCtrl+J',
        click: function () {
          self.getWindow().toggleDevTools()
        }
      }
    ]
  }

  const windowMenu = Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      process.platform === 'darwin' ? editMacOS : edit,
      view
    ])
  )

  trayMenu = new TrayMenu(mainWindow)
  trayMenu.init()
  trayMenu.setToolTip('Internxt Drive ' + PackageJson.version)
  trayMenu.updateContextMenu()
}

app.on('ready', () => {
  createWindow()
})

async function appClose() {
  while (ConfigStore.get('updatingDB')) {
    await new Promise((resolve) => { setTimeout(resolve, 1000) })
  }
  if (mainWindow) {
    mainWindow.destroy()
  }
  if (trayMenu) {
    trayMenu.destroy()
    trayMenu = null
  }
  app.quit()
}

app.on('window-all-closed', () => {
  appClose()
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', function (evt) {
  if (trayMenu) {
    trayMenu.destroy()
  }
})

app.on('browser-window-focus', (e, w) => { })

app.on('sync-on', function () {
  trayMenu.setIsLoadingIcon(true)
  trayMenu.updateSyncState()
})

app.on('sync-off', function () {
  trayMenu.setIsLoadingIcon(false)
  trayMenu.updateSyncState()
})

app.on('change-auto-launch', AutoLaunch.configureAutostart)

function maybeShowWindow() {
  if (mainWindow) {
    mainWindow.show()
  } else {
    app.on('window-show', function () {
      if (mainWindow) {
        mainWindow.show()
      }
    })
  }
}

maybeShowWindow()

app.on('show-bubble', (title, content) => {
  if (trayMenu) {
    trayMenu.displayBallon(title, content)
  }
})

app.on('window-hide', function () {
  if (mainWindow) {
    if (process.env.NODE_ENV !== 'development') {
      mainWindow.hide()
    }
  }
})

app.on('set-tooltip', msg => {
  const message = `Internxt Drive ${PackageJson.version}${msg ? '\n' + msg : ''
  }`
  trayMenu.setToolTip(message)
})

app.on('show-error', msg => {
  dialog.showErrorBox('Error', msg)
})
app.on('show-info', (msg, title) => {
  dialog.showMessageBox({
    message: msg,
    type: 'info',
    title: title
  })
})

/**
 * Auto Updater
 *
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

autoUpdater.logger = Logger

if (process.env.NODE_ENV === 'development') {
  // Only for testing
  autoUpdater.updateConfigPath = 'dev-app-update.yml'
  autoUpdater.currentVersion = '1.0.0'
}

autoUpdater.on('error', err => {
  console.log('AUTOUPDATE ERROR', err.message)
})

autoUpdater.on('checking-for-update', () => {
  // console.log('CHECKING FOR UPDATE EVENT')
})

autoUpdater.on('update-available', () => {
  // console.log('AUTOUPDATER UPD AVAIL')
})

autoUpdater.on('update-not-available', () => {
  console.log('NO UPDATES')
})

autoUpdater.on('download-progress', progress => {
  // console.log('UPDATE DOWNLOAD', progress.percent)
})

autoUpdater.on('update-downloaded', info => {
  Logger.info('New update downloaded, quit and install')
  AnnounceUpdate(info.version)

  // Silent and force re-open after update
  if (process.env.NODE_ENV !== 'development') {
    // autoUpdater.quitAndInstall()
  }
})

function AnnounceUpdate(version) {
  if (UpdateOptions.dialogShow) {
    return
  }
  UpdateOptions.dialogShow = true
  const options = {
    type: 'question',
    buttons: ['Update now', 'Update later'],
    defaultId: 1,
    cancelId: 1,
    title: 'Internxt Drive',
    message: 'New update available: ' + version
  }
  Logger.log('Show update dialog')
  dialog
    .showMessageBox(
      new BrowserWindow({
        show: false,
        parent: mainWindow,
        alwaysOnTop: true,
        width: 400,
        height: 500,
        minWidth: 400,
        minHeight: 500,
        maxWidth: 400,
        maxHeight: 500
      }),
      options
    )
    .then(userResponse => {
      UpdateOptions.dialogShow = false
      if (userResponse.response === 0) {
        Logger.log('Update now')
        autoUpdater.quitAndInstall(false, true)
      } else {
        Logger.log('Update later')
      }
    })
}

const UpdateOptions = {
  doNotAskAgain: false,
  dialogShow: false
}

function SuggestUpdate(version, downloadUrl) {
  if (UpdateOptions.dialogShow) {
    return
  }
  UpdateOptions.dialogShow = true
  const options = {
    type: 'question',
    buttons: ['Download update', 'Ignore'],
    defaultId: 1,
    title: 'Internxt Drive',
    message: 'New Internxt Drive update available: ' + version
  }

  const userResponse = dialog.showMessageBoxSync(
    new BrowserWindow({
      show: false,
      parent: mainWindow,
      alwaysOnTop: true
    }),
    options
  )
  if (userResponse === 0) {
    shell.openExternal(downloadUrl)
  } else {
    UpdateOptions.doNotAskAgain = true
  }
}

function GetAppPlatform() {
  if (process.platform === 'win32') {
    return 'win32'
  }

  if (process.platform === 'linux') {
    return process.env.APPIMAGE ? 'linux-AppImage' : 'linux-deb'
  }

  return process.platform
}

function checkUpdates() {
  if (UpdateOptions.doNotAskAgain) {
    return
  }

  // Get current platform to decide update method
  const platform = GetAppPlatform()

  // DEB package doesn't support autoupdate. So let's check updates manually.
  if (platform === 'linux-deb' || platform === 'darwin') {
    return ManualCheckUpdate()
  }

  autoUpdater
    .checkForUpdates()
    .then(UpdateCheckResult => {
      if (process.env.NODE_ENV !== 'development') {
        // autoUpdater.updateInfoAndProvider = UpdateCheckResult
      }
    })
    .catch(err => {
      console.log('Error checking updates: %s', err.message)
    })
}

async function ManualCheckUpdate() {
  fetch('https://api.github.com/repos/internxt/drive-desktop/releases/latest')
    .then(res => res.text())
    .then(text => {
      try {
        return JSON.parse(text)
      } catch (err) {
        throw new Error(err + ' error update, data: ' + text)
      }
    })
    .then(res => {
      const currentVersion = semver.valid(PackageJson.version)
      const latestVersion = semver.valid(res.tag_name)

      if (semver.gt(latestVersion, currentVersion)) {
        Logger.info('New versión %s is available', latestVersion)
        const currentPlatform = GetAppPlatform()

        let result
        if (currentPlatform === 'linux-deb') {
          result = res.assets.filter(value => value.name.endsWith('.deb'))
        }
        if (currentPlatform === 'darwin') {
          result = res.assets.filter(value => value.name.endsWith('.dmg'))
        }

        if (result && result.length === 1) {
          console.log(
            'Update url available: %s',
            JSON.stringify(result[0].browser_download_url)
          )
          return SuggestUpdate(latestVersion, result[0].browser_download_url)
        } else {
          return console.log(
            'Cannot find %s file for update %s',
            currentPlatform === 'darwin' ? 'DMG' : 'DEB',
            latestVersion
          )
        }
      } else {
        Logger.info('Manual checking updates: no updates')
      }
    })
    .catch(err => {
      Logger.error('Manual check update error ' + err)
    })
}

app.on('ready', () => {
  checkUpdates()

  // Check updates every 6 hours
  setInterval(() => {
    checkUpdates()
  }, 1000 * 60 * 60 * 6)

  powerMonitor.on('suspend', function () {
    Logger.warn('User system suspended')
    app.emit('sync-stop')
  })

  powerMonitor.on('resume', function () {
    Logger.warn('User system resumed')
    app.emit('sync-start')
  })
})
