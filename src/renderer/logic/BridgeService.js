import database from '../../database'
import crypto from 'crypto'
import { mnemonicToSeedSync } from 'bip39'
import querystring from 'querystring'

const BUCKET_NAME_MAGIC = '398734aab3c4c30c9f22590e83a95f7e43556a45fc2b3060e0c39fde31f50272'
const BUCKET_META_MAGIC = Buffer.from([66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162,
  213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38, 164, 162, 200, 86, 201, 2, 81])

async function getBridgeAuth() {
  const userData = await database.Get('xUser')
  const userId = crypto.createHash('sha256').update(userData.user.userId).digest('hex')
  const result = Buffer.from(`${userData.user.email}:${userId}`).toString('base64')
  return result
}

async function findFileByEncryptedName(bucket, encryptedName) {
  const credential = await getBridgeAuth()
  return fetch(`https://api.internxt.com/buckets/${bucket}/file-ids/${querystring.escape(encryptedName)}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Authorization': `Basic ${credential}`
    }
  }).then(async (result) => {
    if (result.status === 200) {
      const contents = await result.json()
      return contents.id
    } else if (result.status === 404) {
      return null
    } else {
      throw result
    }
  }).catch(err => err)
}

function decryptMeta(bufferBase64, decryptKey) {
  const data = Buffer.from(bufferBase64, 'base64')

  const digest = data.slice(0, 16)
  const iv = data.slice(16, 16 + 32)
  const buffer = data.slice(16 + 32)

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(decryptKey, 'hex').slice(0, 32), iv)
  decipher.setAuthTag(digest)
  try {
    const dec = Buffer.concat([decipher.update(buffer), decipher.final()])
    return dec.toString('utf8')
  } catch (e) {
    return null
  }
}

function encryptMeta(data, decryptKey, iv) {
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(decryptKey, 'hex').slice(0, 32), Buffer.from(iv, 'hex').slice(0, 32))
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()])
  const digest = cipher.getAuthTag()

  const finalEnc = Buffer.concat([digest, Buffer.from(iv, 'hex').slice(0, 32), encrypted])

  return finalEnc.toString('base64')
}

function getDeterministicKey(key, id) {
  const sha512input = key + id
  return crypto.createHash('sha512').update(Buffer.from(sha512input, 'hex')).digest('hex').slice(0, 64)
}

function generateBucketKey(mnemonic, bucketId) {
  const seed = mnemonicToSeedSync(mnemonic).toString('hex')
  return getDeterministicKey(seed, bucketId)
}

function decryptFilenameParams(mnemonic, bucketId, encryptedName) {
  const bucketKey = generateBucketKey(mnemonic, bucketId)
  if (!bucketKey) {
    throw Error('Bucket key missing')
  }
  const key = crypto.createHmac('sha512', Buffer.from(bucketKey, 'hex')).update(BUCKET_META_MAGIC).digest('hex')
  return decryptMeta(encryptedName, key)
}

function encryptFilenameParams(mnemonic, bucketId, decryptedName) {
  const bucketKey = generateBucketKey(mnemonic, bucketId)
  if (!bucketKey) {
    throw Error('Bucket key missing')
  }
  const key = crypto.createHmac('sha512', Buffer.from(bucketKey, 'hex')).update(BUCKET_META_MAGIC).digest('hex')
  const iv = crypto.createHmac('sha512', Buffer.from(bucketKey, 'hex')).update(bucketId).update(decryptedName).digest('hex')
  return encryptMeta(decryptedName, key, iv)
}

async function decryptFilename(bucketId, encryptedFilename) {
  const mnemonic = await database.Get('xMnemonic')
  return decryptFilenameParams(mnemonic, bucketId, encryptedFilename)
}

async function encryptFileName(bucketId, decryptedName) {
  const mnemonic = await database.Get('xMnemonic')
  return encryptFilenameParams(mnemonic, bucketId, decryptedName)
}

async function findFileByName(bucketId, fileName) {
  const encryptedName = await encryptFileName(bucketId, fileName)
  return findFileByEncryptedName(bucketId, encryptedName)
}

export default {
  getBridgeAuth,
  findFileByEncryptedName,
  findFileByName,
  decryptFilename,
  encryptFileName
}
