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

async function requestSyncLock() {
  return fetch(`${process.env.API_URL}/api/user/sync`, {
    method: 'GET',
    headers: await Auth.getAuthHeader()
  })
    .then(res => res.text())
    .then(text => {
      try {
        return { data: JSON.parse(text) }
      } catch (err) {
        throw new Error(err + ' data: ' + text)
      }
    })
    .then(res => res.data.data)
    .catch(err => {
      Logger.error('Fetch error getting sync', err)
      throw err
    })
}

function update(toNull = false) {
  Logger.log('Updating user sync device time')
  return new Promise((resolve, reject) => {
    Auth.getAuthHeader().then(header => {
      const fetchOpts = {
        method: 'PUT',
        headers: header,
        mode: 'cors'
      }
      if (toNull) {
        fetchOpts.body = JSON.stringify({ toNull })
      }

      fetch(`${process.env.API_URL}/api/user/sync`, fetchOpts)
        .then(res => {
          if (res.status !== 200) {
            throw Error('Update sync not available on server')
          }
          return res.text()
        })
        .then(text => {
          try {
            return { data: JSON.parse(text) }
          } catch (err) {
            throw new Error(err + ' data: ' + text)
          }
        })

        .then(res => {
          resolve(res.data.data)
        })
        .catch(reject)
    })
  })
}

async function unlock() {
  Logger.info('Sync unlocked')
  const header = await Auth.getAuthHeader()
  return new Promise((resolve, reject) => {
    fetch(`${process.env.API_URL}/api/user/sync`, {
      method: 'DELETE',
      headers: header
    })
      .then(res => {
        if (res.status === 200) {
          resolve()
        } else {
          reject(res.status)
        }
      })
      .catch(err => {
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
