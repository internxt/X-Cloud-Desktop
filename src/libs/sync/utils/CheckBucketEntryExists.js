import Network from './Network'
import Credentials from './Credentials'

function CheckBucketEntryExists(fileName) {
  const inxt = Network.getEnvironment()
  console.log(inxt)
  console.log(inxt.listFiles)
}

export default CheckBucketEntryExists
