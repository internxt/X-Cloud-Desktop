'use strict'
import Database from '../../../database'

// const { Environment } = require('storj')
const { Environment } = require('inxt-js')

async function _getStorjCredentials() {
  const mnemonic = await Database.Get('xMnemonic')
  const userInfo = (await Database.Get('xUser')).user

  const options = {
    bridgeUrl: 'https://api.internxt.com',
    bridgeUser: userInfo.email,
    bridgePass: userInfo.userId,
    encryptionKey: mnemonic
  }

  return options
}

async function getEnvironment() {
  const options = await _getStorjCredentials()
  return new Promise((resolve, reject) => {
    try {
      const storj = new Environment(options)
      resolve(storj)
    } catch (err) {
      console.error('get environment error', err)
      reject(err)
    }
  })
}

export default getEnvironment
