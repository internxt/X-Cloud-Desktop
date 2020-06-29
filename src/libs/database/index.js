import { createConnection, EntitySchema } from 'typeorm'
const Constants = require('../constants')
const fs = require('fs')
const Models = require('./models')
const { EventEmitter } = require('events')
const async = require('async')

class Database extends EventEmitter {
  constructor() {
    super()
    this.isConnected = false
    this.connectCall = false
    this.connection = null
    this.LocalFile = null
    this.User = null
  }

  connect() {
    if (this.connectCall) {
      return Promise.resolve('b')
    }
    this.connectCall = true
    const DB_PATH = Constants.GetDatabaseFilePath()

    const models = []
    for (const model in Models) {
      models.push(new EntitySchema(Models[model]))
    }

    return new Promise((resolve, reject) => {
      return createConnection({
        type: 'sqlite',
        database: DB_PATH,
        synchronize: true,
        entities: models
      }).then(conn => {
        this.isConnected = true
        this.connection = conn
        console.log('Load models')
        this.LocalFile = conn.getRepository('LocalFile')
        this.User = conn.getRepository('User')
        resolve('a')
      }).catch(err => {
        reject(err)
      })
    })
  }

  clearAll() {
    return new Promise((resolve, reject) => {
      async.parallel([
        next => this.User.clear().then(() => next()).catch(next),
        next => this.LocalFile.clear().then(() => next()).catch(next)
      ], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }
}

const INSTANCE = new Database()

function GetInstance() {
  if (!INSTANCE.connectCall) {
    return INSTANCE.connect().then(() => {
      return Promise.resolve(INSTANCE)
    })
  } else {
    return Promise.resolve(INSTANCE)
  }
}

export default GetInstance
