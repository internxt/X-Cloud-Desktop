import fs from 'fs'
import electron from 'electron'

const app = electron.remote.app

function setModifiedTime(path, time) {
  let convertedTime = ''

  const StringType = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/
  const UnixType = /^[0-9]{14}$/

  if (time.match(StringType)) { convertedTime = new Date(time).getTime() * 1 / 1000 }
  if (time.match(UnixType)) { convertedTime = time * 1 }
  if (time instanceof Date) { convertedTime = time.getTime() / 1000.0 }

  return new Promise((resolve, reject) => {
    if (!time) { return resolve() }
    try {
      fs.utimesSync(path, convertedTime, convertedTime)
      resolve()
    } catch (err) { reject(err) }
  })
}

export default {
  setModifiedTime
}
