import PackageJson from '../../../../package.json'
import GetInstance from '../../database'
import CheckFileExists from './CheckFileExists'

class Credentials {
  constructor() {
    this.user = null
    this.userId = null
    this.token = null
    this.mnemonic = null
    this.path = null
    this.rootBucket = null
    this.initialized = false
  }

  /**
   * Init credentials
   */
  async init() {
    return GetInstance().then(Database => {
      console.log('INIT CREDENTIALS')
      return Database.User.find().then(results => {
        const user = results[0]

        // Save
        this.user = user.email
        this.userId = user.userId
        this.token = user.token
        this.mnemonic = user.mnemonic
        this.path = user.path

        // Initialized
        this.initialized = true
        return user
      }).then(user => {
        return CheckFileExists.CheckFolderExists('.').then(result => {
          if (result.data.isRoot) {
            this.rootBucket = result.data.path.bucket
          }
        })
      })
    })
  }

  getHeaders(withAuth = false, withMnemonic = false) {
    const headers = {}

    headers['Content-Type'] = 'application/json; charset=utf-8'
    headers['internxt-version'] = PackageJson.version
    headers['internxt-client'] = 'drive-desktop'

    if (withAuth) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (withMnemonic) {
      headers['internxt-mnemonic'] = this.mnemonic
    }

    return headers
  }
}

const INSTANCE = new Credentials()

export default INSTANCE
