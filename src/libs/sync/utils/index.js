import ListLocalFolder from './ListLocalFolder'
import CheckFileExists from './CheckFileExists'
import Credentials from './Credentials'
import CheckBucketEntryExists from './CheckBucketEntryExists'
import UploadFile from './UploadFile'

export default {
  ListLocalFolder,
  CheckFileExists: CheckFileExists.CheckFileExists,
  CheckFolderExists: CheckFileExists.CheckFolderExists,
  CreateFolders: CheckFileExists.CreateFolders,
  Credentials: Credentials,
  UploadFile,
  CheckBucketEntryExists
}
