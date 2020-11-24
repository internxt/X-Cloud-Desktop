import ConfigStore from '../../../main/config-store'
const Analytics = require('analytics-node')
const client = new Analytics(process.env.APP_SEGMENT_KEY)

const user = {
  userData: {
    email: undefined,
    uuid: undefined
  },
  getSyncMode: function() {
    return ConfigStore.get('syncMode')
  },
  setUser: function (data) {
    this.userData.email = data.email
    this.userData.uuid = data.uuid
  },
  getUser: function () {
    return this.userData
  }

}

export { client, user }
