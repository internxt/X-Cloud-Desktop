/**
 * Device Lock
 *
 * Get server lock to prevent multiple devices syncing at the same time.
 */

import database from '../../database'
import Logger from '../../libs/logger'
import Auth from './utils/Auth'

const SYNC_KEEPALIVE_INTERVAL_MS = 25000

let updateSyncInterval

function startUpdateDeviceSync() {
  Logger.log('Started sync lock update interval')
  update()
  updateSyncInterval = setInterval(() => update(), SYNC_KEEPALIVE_INTERVAL_MS)
}

function stopUpdateDeviceSync() {
  if (!updateSyncInterval) {
    Logger.warn('No sync lock update interval to stop')
  } else {
    Logger.log('Stopped sync lock update interval')
  }
  unlock().catch(() => {})
  clearInterval(updateSyncInterval)
}

function requestSyncLock() {
  return new Promise(async (resolve, reject) => {
    database.Get('xUser').then(async userData => {
      fetch(`${process.env.API_URL}/api/user/sync`, {
        method: 'GET',
        headers: await Auth.getAuthHeader()
      }).then(async res => {
        return { res, data: await res.json() }
      }).then(res => {
        resolve(res.data.data)
      }).catch(err => {
        Logger.error('Fetch error getting sync', err)
        reject(err)
      })
    })
  })
}

function update(toNull = false) {
  Logger.log('Updating user sync device time')
  return new Promise(async (resolve, reject) => {
    database.Get('xUser').then(userData => {
      const fetchOpts = {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${userData.token}`,
          'content-type': 'application/json'
        },
        mode: 'cors'
      }
      if (toNull) {
        fetchOpts.body = JSON.stringify({ toNull })
      }

      fetch(`${process.env.API_URL}/api/user/sync`, fetchOpts)
        .then(async res => {
          if (res.status !== 200) {
            throw Error('Update sync not available on server')
          }
          return { res, data: await res.json() }
        })
        .then(res => {
          resolve(res.data.data)
        }).catch(reject)
    })
  })
}

async function unlock() {
  Logger.info('Sync unlocked')
  return new Promise(async (resolve, reject) => {
    const userData = await database.Get('xUser')
    fetch(`${process.env.API_URL}/api/user/sync`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${userData.token}`,
        'content-type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        resolve()
      } else {
        reject(res.status)
      }
    }).catch(err => {
      reject(err)
    })
  })
}

export default {
  SYNC_KEEPALIVE_INTERVAL_MS,
  startUpdateDeviceSync,
  stopUpdateDeviceSync,
  requestSyncLock,
  update,
  unlock
}
