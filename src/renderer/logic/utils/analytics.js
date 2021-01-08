import Logger from '../../../libs/logger'
import ConfigStore from '../../../main/config-store'
import database from '../../../database'
const Analytics = require('analytics-node')
const segmentAnalytics = new Analytics(process.env.APP_SEGMENT_KEY)

const analytics = {
  userData: {
    userMail: undefined,
    uuid: undefined
  },
  track: async function(object) {
    if (!object.anonymousId) {
      if (!this.userData.uuid) {
        const user = (await database.Get('xUser'))
        if (!user || !user.user.email || !user.user.uuid) {
          console.log(JSON.stringify(user))
          console.log(JSON.stringify(user.user.uuid))
          return Logger.warn('xUser is not inicialized')
          // throw new Error('xUser is not inicialized')
        }
        this.userData.userMail = user.user.email
        this.userData.uuid = user.user.uuid
      }
      object.userId = this.userData.uuid
      if (this.userData.userMail && object.properties.email) {
        object.properties.email = this.userData.userMail
      }
    }
    segmentAnalytics.track(object)
  },
  identify: async function(object) {
    if (!object.anonymousId) {
      if (!this.userData.uuid) {
        const user = (await database.Get('xUser'))
        if (!user || !user.user.email || !user.user.uuid) {
          return Logger.warn('xUser is not inicialized')
          // throw new Error('xUser is not inicialized')
        }
        this.userData.userMail = user.user.email
        this.userData.uuid = user.user.uuid
      }
      object.userId = this.userData.uuid
      if (this.userData.userMail && object.email) {
        object.email = this.userData.userMail
      }
    }
    segmentAnalytics.identify(object)
  },
  resetUser: function() {
    this.userData.userMail = undefined
    this.userData.uuid = undefined
  }
}

export default analytics
