import ListLocalFolder from './ListLocalFolder'
import CheckFileExists from './CheckFileExists'
import Credentials from './Credentials'

export default {
  ListLocalFolder,
  CheckFileExists: CheckFileExists.CheckFileExists,
  CheckFolderExists: CheckFileExists.CheckFolderExists,
  CreateFolders: CheckFileExists.CreateFolders,
  Credentials: Credentials
}
