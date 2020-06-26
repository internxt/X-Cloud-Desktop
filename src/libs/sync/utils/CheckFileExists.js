import Credentials from './Credentials'

async function ExistsRequest(path, mkdirp = false, isFile = true) {
  const req = await fetch(`${process.env.API_URL}/api/storage/exists`, {
    method: 'POST',
    mode: 'cors',
    headers: Credentials.getHeaders(true),
    body: JSON.stringify({
      path: path,
      mkdirp: mkdirp,
      isFile: isFile
    })
  })

  return req
}

function CheckFileExists(path) {
  return ExistsRequest(path, false, true)
}

function CheckFolderExists(path) {
  return ExistsRequest(path, false, false)
}

function CreateFolders(path) {
  return ExistsRequest(path, true, false)
}

export default {
  CheckFileExists,
  CheckFolderExists,
  CreateFolders
}
