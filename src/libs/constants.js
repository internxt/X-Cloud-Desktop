const { remote } = require('electron')
const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')

const DB_FILE_NAME = 'sync.sqlite3'

function GetHomeFolder() {
  if (process.env.NODE_ENV === 'development') {
    return path.resolve('.')
  } else {
    return remote.app.getPath('home')
  }
}

function GetConfigFolder() {
  const configFolder = path.join(GetHomeFolder(), '.internxt-drive')
  if (!fs.existsSync(configFolder)) {
    mkdirp.sync(configFolder)
  }
  return configFolder
}

function GetDatabaseFilePath() {
  return path.join(GetConfigFolder(), DB_FILE_NAME)
}

module.exports = {
  GetHomeFolder,
  GetConfigFolder,
  DB_FILE_NAME,
  GetDatabaseFilePath
}
