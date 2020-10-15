import database from '../../../database/index'

async function GetAuthHeader(withMnemonic) {
  const userData = await database.Get('xUser')
  const header = {
    Authorization: `Bearer ${userData.token}`,
    'content-type': 'application/json; charset=utf-8'
  }
  if (withMnemonic === true) {
    const mnemonic = await database.Get('xMnemonic')
    header['internxt-mnemonic'] = mnemonic
  }
  return header
}

export default {
  GetAuthHeader
}