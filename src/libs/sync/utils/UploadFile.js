import { Environment } from 'storj'
import CheckFileExists from './CheckFileExists'
import Credentials from './Credentials'
import CheckBucketEntryExists from './CheckBucketEntryExists'

function UploadFile(localPath, folderId, replace = false) {
  console.log('UPLOAD')
  if (replace) {
  } else {
  }
  CheckBucketEntryExists('HOLI')
}

export default UploadFile
