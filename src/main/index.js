'use strict'

import { app, BrowserWindow, Tray, Menu, shell } from 'electron'
import path from 'path'
import Logger from '../libs/logger'
import AutoLaunch from 'auto-launch'
import config from '../config'

var autoLaunch = new AutoLaunch({
  name: 'Internxt Drive'
})

autoLaunch.isEnabled().then((isEnabled) => {
  if (!isEnabled) autoLaunch.enable()
})

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = path.join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow, tray

const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

if (process.platform === 'darwin') {
  app.dock.hide()
}

const isSecondAppInstance = app.makeSingleInstance(function () {
  if (mainWindow) {
    mainWindow.hide()
  }
  return true
})

if (isSecondAppInstance) {
  app.quit()
}

function destroyTray() {
  if (tray) {
    tray.destroy()
  }
  tray = null
  mainWindow = null
}

function getTrayIcon(isLoading) {
  let iconName = isLoading ? 'sync-icon' : 'tray-icon'

  let trayIcon = path.join(__dirname, '../../src/resources/icons/' + iconName + '@2x.png')

  if (process.platform === 'darwin') {
    trayIcon = path.join(__dirname, '../../src/resources/icons/' + iconName + '-macTemplate@2x.png')
  }

  if (tray) {
    tray.setImage(trayIcon)
  }

  return trayIcon
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 550,
    useContentSize: true,
    frame: process.env.NODE_ENV === 'development',
    autoHideMenuBar: true,
    skipTaskbar: process.env.NODE_ENV !== 'development',
    show: process.env.NODE_ENV === 'development'
  })

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', appClose)

  let edit = {
    label: 'Edit',
    submenu: [
      {
        label: 'Undo',
        accelerator: 'CmdOrCtrl+Z',
        click: function () {
          self.getWindow().webContents.undo()
        }
      }, {
        label: 'Redo',
        accelerator: 'CmdOrCtrl+Y',
        click: function () {
          self.getWindow().webContents.redo()
        }
      }, {
        type: 'separator'
      }, {
        label: 'Cut',
        accelerator: 'CmdOrCtrl+X',
        click: function () {
          self.getWindow().webContents.cut()
        }
      }, {
        label: 'Copy',
        accelerator: 'CmdOrCtrl+C',
        click: function () {
          self.getWindow().webContents.copy()
        }
      }, {
        label: 'Paste',
        accelerator: 'CmdOrCtrl+V',
        click: function () {
          self.getWindow().webContents.paste()
        }
      }, {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        click: function () {
          self.getWindow().webContents.selectAll()
        }
      }
    ]
  }

  let editMacOS = {
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

  let view = {
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

  let windowMenu = Menu.setApplicationMenu(
    Menu.buildFromTemplate([process.platform === 'darwin' ? editMacOS : edit, view])
  )

  let trayIcon = getTrayIcon()

  tray = new Tray(trayIcon)
  tray.setToolTip('Internxt Drive')

  const contextMenu = () => Menu.buildFromTemplate([
    {
      label: 'Open folder',
      click: function () {
        app.emit('open-folder')
      }
    },
    {
      label: 'Force sync',
      click: function () {
        app.emit('sync-start')
      }
    },
    {
      label: 'Billing',
      click: function () { shell.openExternal(`${config.DRIVE_BASE}/storage`) }
    },
    {
      label: 'Log out',
      click: function () {
        app.emit('user-logout')
      }
    },
    {
      label: 'Quit',
      click: appClose
    }
  ])

  tray.setContextMenu(contextMenu())
}

app.on('ready', () => {
  createWindow()
})

function appClose() {
  destroyTray()
  if (process.platform !== 'darwin') { app.quit() }
  mainWindow = null
}

app.on('window-all-closed', appClose)

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('before-quit', function (evt) {
  if (tray) {
    tray.destroy()
  }
})

app.on('sync-on', function () {
  tray.setImage(getTrayIcon(true))
})

app.on('sync-off', function () {
  tray.setImage(getTrayIcon(false))
})

app.on('window-show', function () {
  if (mainWindow) {
    mainWindow.show()
  }
})

app.on('show-bubble', (title, content) => {
  if (tray) {
    tray.displayBalloon({
      title: title,
      content: content
    })
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
  tray.setToolTip('Internxt Drive' + (msg ? '\n' + msg : ''))
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
