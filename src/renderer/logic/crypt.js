import CryptoJS from 'crypto-js'
import crypto from 'crypto'
import fs from 'fs'
import async from 'async'
import Logger from '../../libs/logger'
import AesUtil from './AesUtil'
import path from 'path'

const CRYPTO_KEY = process.env.CRYPTO_KEY

if (!CRYPTO_KEY) {
  Logger.error('No encryption key provided')
  throw Error('No encryption key provided')
}

function encryptWithKey(textToEncrypt, key) {
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, key).toString()
  const text64 = CryptoJS.enc.Base64.parse(bytes)
  return text64.toString(CryptoJS.enc.Hex)
}

function encrypt(textToEncrypt) {
  return encryptWithKey(textToEncrypt, CRYPTO_KEY)
}

function decryptWithKey(cipherText, key) {
  const reb = CryptoJS.enc.Hex.parse(cipherText)
  const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

function decrypt(cipherText) {
  return decryptWithKey(cipherText, CRYPTO_KEY)
}

function hashPassword(rawPassword, salt) {
  salt = salt ? CryptoJS.enc.Hex.parse(salt) : CryptoJS.lib.WordArray.random(128 / 8)
  const hash = CryptoJS.PBKDF2(rawPassword, salt, { keySize: 256 / 32, iterations: 10000 })
  return { hash, salt }
}

function deterministicDecryption(cipherText, salt) {
  try {
    const key = CryptoJS.enc.Hex.parse(CRYPTO_KEY)
    const iv = salt ? CryptoJS.enc.Hex.parse(salt.toString()) : key

    const reb64 = CryptoJS.enc.Hex.parse(cipherText)
    const bytes = reb64.toString(CryptoJS.enc.Base64)
    const decrypt = CryptoJS.AES.decrypt(bytes, key, { iv: iv })
    const plain = decrypt.toString(CryptoJS.enc.Utf8)

    return plain
  } catch (e) {
    return null
  }
}

function decryptName(cipherText, salt) {
  if (!salt) {
    // If no salt, something is trying to use legacy decryption
    return probabilisticDecryption(cipherText)
  } else {
    try {
      const possibleAesResult = AesUtil.decrypt(cipherText, salt)
      return possibleAesResult
    } catch (e) {

    }

    console.log(cipherText, salt)

    const decrypted = deterministicDecryption(cipherText, salt)

    if (!decrypted) {
      Logger.warn('Error decrypting on a deterministic way')
      return probabilisticDecryption(cipherText)
    } else {
      return decrypted
    }
  }
}

function probabilisticDecryption(cipherText) {
  try {
    const reb64 = CryptoJS.enc.Hex.parse(cipherText)
    const bytes = reb64.toString(CryptoJS.enc.Base64)
    const decrypt = CryptoJS.AES.decrypt(bytes, CRYPTO_KEY)
    const plain = decrypt.toString(CryptoJS.enc.Utf8)
    return plain
  } catch (error) {
    return null
  }
}

function probabilisticEncryption(content) {
  try {
    const b64 = CryptoJS.AES.encrypt(content, CRYPTO_KEY).toString()
    const e64 = CryptoJS.enc.Base64.parse(b64)
    const eHex = e64.toString(CryptoJS.enc.Hex)
    return eHex
  } catch (error) {
    return null
  }
}

function encryptName(name, salt) {
  if (!salt) {
    // If no salt, somewhere is trying to use legacy encryption
    return probabilisticEncryption(name)
  } else {
    // If salt is provided, use new deterministic encryption
    return AesUtil.encrypt(name, salt)
  }
}

function fileHash(path, hash) {
  return new Promise((resolve, reject) => {
    const hasher = crypto.createHash(hash || 'SHA256')
    const stream = fs.createReadStream(path)
    stream.on('data', function (data) {
      hasher.update(data)
    })
    stream.on('end', function () {
      resolve(hasher.digest('hex'))
    })
    stream.on('error', function (err) {
      reject(err)
    })
  })
}

function compareHash(path1, path2, hash) {
  return new Promise((resolve, reject) => {
    async.parallel([
      (next) => {
        fileHash(path1, hash).then(result => next(null, result)).catch(next)
      },
      (next) => {
        fileHash(path2, hash).then(result => next(null, result)).catch(next)
      }
    ], function (err, results) {
      if (err) { reject(err) } else {
        resolve(results[0] === results[1])
      }
    })
  })
}

function encryptFilename(fileName, folderId) {
  const fileNameParts = path.parse(fileName)
  const encryptedFileName = encryptName(fileNameParts.name, folderId + '')
  return encryptedFileName
}

export default {
  encrypt,
  encryptWithKey,
  decrypt,
  decryptWithKey,
  hashPassword,
  deterministicDecryption,
  probabilisticDecryption,
  decryptName,
  fileHash,
  compareHash,
  encryptFilename
}
