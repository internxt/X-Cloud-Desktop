import Database from '../../database/index'
import PathTrie from './utils/pathTrie'

const matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g

/**
 *
 * @param {string} path parent path, example: C:\\internxt
 * @param {number} level return 1 - level, if level is 0, return all level
 */
function generateRegExp(path, level = 0) {
  let sep
  const parentPath = path.replace(matchOperatorsRe, '\\$&')
  if (process.platform === 'win32') {
    sep = '\\\\'
  } else {
    sep = '/'
  }
  if (level) {
    return new RegExp(`^(/){0,1}${parentPath}(${sep}[^${sep}]+){1,${level}}[^${sep}]+$`)
  } else {
    return new RegExp(`^(/){0,1}${parentPath}`)
  }
}

function setTrie(path, action) {
  PathTrie.set(path, action)
}

export default {
  generateRegExp,
  setTrie,
  selectAction: PathTrie.selectAction
}
