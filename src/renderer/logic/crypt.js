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

function EncryptWithKey(textToEncrypt, key) {
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, key).toString()
  const text64 = CryptoJS.enc.Base64.parse(bytes)
  return text64.toString(CryptoJS.enc.Hex)
}

function Encrypt(textToEncrypt) {
  return EncryptWithKey(textToEncrypt, CRYPTO_KEY)
}

function DecryptWithKey(cipherText, key) {
  const reb = CryptoJS.enc.Hex.parse(cipherText)
  const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

function Decrypt(cipherText) {
  return DecryptWithKey(cipherText, CRYPTO_KEY)
}

function HashPassword(rawPassword, salt) {
  salt = salt ? CryptoJS.enc.Hex.parse(salt) : CryptoJS.lib.WordArray.random(128 / 8)
  const hash = CryptoJS.PBKDF2(rawPassword, salt, { keySize: 256 / 32, iterations: 10000 })
  return { hash, salt }
}

function DeterministicDecryption(cipherText, salt) {
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

function DecryptName(cipherText, salt) {
  if (!salt) {
    // If no salt, something is trying to use legacy decryption
    return ProbabilisticDecryption(cipherText)
  } else {
    try {
      const possibleAesResult = AesUtil.decrypt(cipherText, salt)
      return possibleAesResult
    } catch (e) {

    }
    const decrypted = DeterministicDecryption(cipherText, salt)

    if (!decrypted) {
      Logger.warn('Error decrypting on a deterministic way')
      return ProbabilisticDecryption(cipherText)
    } else {
      return decrypted
    }
  }
}

function ProbabilisticDecryption(cipherText) {
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

function ProbabilisticEncryption(content) {
  try {
    const b64 = CryptoJS.AES.encrypt(content, CRYPTO_KEY).toString()
    const e64 = CryptoJS.enc.Base64.parse(b64)
    const eHex = e64.toString(CryptoJS.enc.Hex)
    return eHex
  } catch (error) {
    return null
  }
}

function EncryptName(name, salt) {
  if (!salt) {
    // If no salt, somewhere is trying to use legacy encryption
    return ProbabilisticEncryption(name)
  } else {
    // If salt is provided, use new deterministic encryption
    return AesUtil.encrypt(name, salt)
  }
}

function FileHash(path, hash) {
  return new Promise((resolve, reject) => {
    let hasher = crypto.createHash(hash || 'SHA256')
    let stream = fs.createReadStream(path)
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

function CompareHash(path1, path2, hash) {
  return new Promise((resolve, reject) => {
    async.parallel([
      (next) => {
        FileHash(path1, hash).then(result => next(null, result)).catch(next)
      },
      (next) => {
        FileHash(path2, hash).then(result => next(null, result)).catch(next)
      }
    ], function (err, results) {
      if (err) { reject(err) } else {
        resolve(results[0] === results[1])
      }
    })
  })
}

function EncryptFilename(fileName, folderId) {
  const fileNameParts = path.parse(fileName)
  const encryptedFileName = EncryptName(fileNameParts.name, folderId + '')
  return encryptedFileName
}

export default {
  Encrypt,
  EncryptWithKey,
  Decrypt,
  DecryptWithKey,
  HashPassword,
  DeterministicDecryption,
  ProbabilisticDecryption,
  DecryptName,
  FileHash,
  CompareHash,
  EncryptFilename
}
