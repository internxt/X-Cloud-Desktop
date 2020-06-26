import PackageJson from '../../../../package.json'
import GetInstance from '../../database'

class Credentials {
  constructor() {
    this.user = null
    this.userId = null
    this.token = null
    this.mnemonic = null
    this.initialized = false
  }

  /**
   * Init credentials
   */
  init() {
    return GetInstance().then(Database => {
      return Database.User.find().then(results => {
        const user = results[0]
        this.user = user.email
        this.userId = user.userId
        this.token = user.token
        this.mnemonic = user.mnemonic
        this.initialized = true
      }).catch(err => {
        console.log('Error initializing Credentials', err.message)
        this.initialized = false
      })
    })
  }

  getHeaders(withAuth = false, withMnemonic = false) {
    const headers = {}

    headers['content-type'] = 'application/json; charset=utf-8'
    headers['internxt-version'] = PackageJson.version
    headers['internxt-client'] = 'drive-desktop'

    if (withAuth) {
      headers['authorization'] = `Bearer ${this.token}`
    }

    if (withMnemonic) {
      headers['internxt-mnemonic'] = this.mnemonic
    }

    return headers
  }
}

const INSTANCE = new Credentials()

export default INSTANCE
