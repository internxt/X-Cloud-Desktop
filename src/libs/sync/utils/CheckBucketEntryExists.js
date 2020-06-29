import Network from './Network'
import Credentials from './Credentials'

function CheckBucketEntryExists(fileName) {
  const inxt = Network.getEnvironment()
  console.log(Credentials)
  inxt.listFiles(Credentials.rootBucket, (err, filesList) => {
    if (err) {
      console.log('ERROR LIST FILES', err.message)
    }
    filesList.forEach(item => {
      console.log(item.filename)
    })
  })
}

export default CheckBucketEntryExists
