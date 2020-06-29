import readdirp from 'readdirp'

function ListLocalFolder(folderPath) {
  let results = []
  return new Promise(resolve => {
    readdirp(folderPath, {
      type: 'all', alwaysStat: true, lstat: true
    }).on('data', (entry) => {
      results.push(entry)
    }).on('warn', entry => {
      console.log('READDIRP WARNING', entry)
    }).on('error', (err) => {
      console.log('READDIRP ERROR', err.message)
    }).on('end', () => {
      resolve(results)
    })
  })
}

export default ListLocalFolder
