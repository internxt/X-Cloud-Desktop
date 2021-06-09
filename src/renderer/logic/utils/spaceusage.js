import Logger from '../../../libs/logger'
import ConfigStore from '../../../main/config-store'
import Auth from './Auth'
const remote = require('@electron/remote')

const API_URL = process.env.API_URL

async function fetchOptions() {
  return {
    method: 'GET',
    headers: await Auth.getAuthHeader(false)
  }
}

async function getLimit() {
  const endpoint = `${API_URL}/api/limit`
  const options = await fetchOptions()

  return fetch(endpoint, options)
    .then(res => {
      // Check server response
      if (res.status === 200) {
        return res
      } else {
        throw new Error(res)
      }
    })
    .then(res => {
      // Check response body
      return res.text().then(text => {
        try {
          return JSON.parse(text)
        } catch (err) {
          throw new Error(err + ' error update, data: ' + text)
        }
      })
    })
    .then(body => {
      return body.maxSpaceBytes
    })
}

async function getUsage() {
  const endpoint = `${API_URL}/api/usage`
  const options = await fetchOptions()

  return fetch(endpoint, options)
    .then(res => {
      // Check server response
      if (res.status === 200) {
        return res
      } else {
        throw new Error(res)
      }
    })
    .then(res => {
      // Check response body
      return res.text().then((text) => {
        try {
          return JSON.parse(text)
        } catch (err) {
          throw new Error(err + ' data: ' + text)
        }
      })
    })
    .then(body => {
      return body.total
    })
}

async function updateUsage() {
  await getLimit()
    .then(limit => {
      remote.app.emit('update-storage', {
        limit: limit
      })
      ConfigStore.set('limit', limit)
    })
    .catch(() => {
      Logger.error("Cannot get user limit, won't be displayed")
    })

  await getUsage()
    .then(usage => {
      remote.app.emit('update-storage', {
        usage: usage
      })
      ConfigStore.set('usage', usage)
    })
    .catch(() => {
      Logger.error("Cannot get user usage, won't be displayed")
    })

  Auth.getUserEmail().then(email => {
    remote.app.emit('update-menu', email)
  })
}

export default {
  getLimit,
  getUsage,
  updateUsage
}
