import { Environment } from 'storj'
import Credentials from './Credentials'

function getEnvironment() {
  const inxt = new Environment({
    bridgeUser: Credentials.user,
    bridgePass: Credentials.userId,
    bridgeUrl: 'https://api.internxt.com',
    encryptionKey: Credentials.mnemonic
  })
  return inxt
}

export default { getEnvironment }
