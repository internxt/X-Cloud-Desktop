import path from 'path'
import PackageJson from '../../package.json'
import { Tray, Menu, app, shell, dialog } from 'electron'
import ConfigStore from './config-store'
import Logger from '../libs/logger'
import fs from 'fs'
import electronLog from 'electron-log'
import pretty from 'prettysize'

var email
class TrayMenu {
  constructor(mainWindow) {
    this.tray = null
    this.mainWindow = mainWindow
  }

  init() {
    const trayIcon = this.iconPath()

    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('Internxt Drive ' + PackageJson.version)

    this.updateContextMenu()
  }

  iconPath(isLoading = false) {
    const iconName = isLoading ? 'sync-icon' : 'tray-icon'

    // Default icon
    let trayIcon = path.join(
      __dirname,
      '../../src/resources/icons/' + iconName + '@2x.png'
    )

    // Template icon for mac
    if (process.platform === 'darwin') {
      trayIcon = path.join(
        __dirname,
        '../../src/resources/icons/' + iconName + '-macTemplate@2x.png'
      )
    }

    return trayIcon
  }

  generateContextMenu(userEmail) {
    email = userEmail
    let userMenu = []

    if (userEmail) {
      // Show user account
      const userEmailDisplay = [
        {
          label: userEmail,
          enabled: false
        }
      ]

      let userUsage = []
      // Show user display (if we have the data)
      const accountLimit = ConfigStore.get('limit')
      const accountUsage = ConfigStore.get('usage')
      if (accountLimit < 0 || accountUsage < 0) {
        // Usage not ready to be displayed
      } else {
        const readableUsage = pretty(accountUsage)
        const readableLimit = pretty(accountLimit)
        const usageString = `Used ${readableUsage} of ${readableLimit}`
        userUsage = [
          {
            label: usageString,
            enabled: false
          }
        ]
      }

      const userFooter = [
        {
          type: 'separator'
        }
      ]
      const syncing = ConfigStore.get('isSyncing')
      if (userEmail) {
        userFooter.push({
          label: syncing ? 'Syncing...' : 'Waiting for next sync',
          enabled: false
        })
      }
      if (userEmail) {
        userFooter.push({
          label: 'Change sync folder',
          click: function() {
            const newDir = dialog.showOpenDialogSync({
              properties: ['openDirectory']
            })
            if (newDir && newDir.length > 0 && fs.existsSync(newDir[0])) {
              app.emit('new-folder-path', newDir[0])
            } else {
              Logger.info('Sync folder change error or cancelled')
            }
          }
        })
      }

      userMenu = Array.concat(userEmailDisplay, userUsage, userFooter)
    }

    const contextMenuTemplate = []
    if (userEmail) {
      contextMenuTemplate.push({
        label: 'Open folder',
        click: function() {
          app.emit('open-folder')
        }
      })
    }
    contextMenuTemplate.push({
      label: 'Sync options',
      enabled: true,
      submenu: [
        {
          label: 'Two Way Sync',
          type: 'radio',
          enabled: true,
          checked: ConfigStore.get('syncMode') === 'two-way',
          click: () => {
            Logger.info('User switched to two way sync mode')
            ConfigStore.set('syncMode', 'two-way')
            app.emit('sync-stop')
            app.emit('switch-mode')
          }
        },
        {
          label: 'Upload Only Mode',
          type: 'radio',
          enabled: true,
          checked: ConfigStore.get('syncMode') === 'one-way-upload',
          click: () => {
            Logger.info('User switched to one way upload mode')
            ConfigStore.set('syncMode', 'one-way-upload')
            app.emit('sync-stop')
          }
        }
      ]
    })
    if (userEmail) {
      contextMenuTemplate.push({
        label: 'Force sync',
        click: function() {
          app.emit('force-sync')
        }
      })
    }
    contextMenuTemplate.push(
      {
        label: 'Open logs',
        click: function() {
          try {
            const logFile = electronLog.transports.file.getFile().path
            const logPath = path.dirname(logFile)
            shell.openPath(logPath)
          } catch (e) {
            Logger.error('Error opening log path: %s', e.message)
          }
        }
      },
      {
        label: 'Billing',
        click: function() {
          shell.openExternal(`${process.env.API_URL}/storage`)
        }
      },
      {
        label: 'Launch at login',
        type: 'checkbox',
        checked: ConfigStore.get('autoLaunch'),
        click: function(check) {
          ConfigStore.set('autoLaunch', check.checked)
          console.log(check.checked)
          app.emit('change-auto-launch')
        }
      },
      {
        label: 'Contact Support',
        click: function() {
          shell.openExternal(
            `mailto:support@internxt.zohodesk.eu?subject=Support Ticket&body=If you want to upload log files to our tech teams. Please, find them on the Open Logs option in the menu.`
          )
        }
      },
      {
        type: 'separator'
      }
    )

    if (userEmail) {
      contextMenuTemplate.push({
        label: 'Log out',
        click: function() {
          app.emit('user-logout')
        }
      })
    }
    contextMenuTemplate.push({
      label: 'Quit',
      click: this.appClose
    })

    return Menu.buildFromTemplate(Array.concat(userMenu, contextMenuTemplate))
  }

  updateContextMenu(user) {
    const ctxMenu = this.generateContextMenu(user)
    this.tray.setContextMenu(ctxMenu)
  }

  updateSyncState() {
    const ctxMenu = this.generateContextMenu(email)
    this.tray.setContextMenu(ctxMenu)
  }

  setToolTip(text) {
    this.tray.setToolTip(text)
  }

  displayBallon(title, content) {
    if (this.tray) {
      this.tray.displayBalloon({
        title: title,
        content: content
      })
    }
  }

  appClose() {
    app.emit('app-close')
  }

  setImage(imagePath) {
    this.tray.setImage(imagePath)
  }

  setIsLoadingIcon(isLoading) {
    const newImage = this.iconPath(isLoading)
    this.setImage(newImage)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}

export default TrayMenu
