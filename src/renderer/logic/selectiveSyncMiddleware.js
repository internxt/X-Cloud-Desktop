import Database from '../../database/index'
import PathTrie from './utils/pathTrie'
/**
 *
 * @param {string} path parent path, example: C:\\internxt
 * @param {number} level return 1 - level, if level is 0, return all level
 */
function generateRegExp(path, level = 0) {
  let sep
  let parentPath = path
  if (process.platform === 'win32') {
    sep = '\\\\'
    parentPath = parentPath.replace(/\\/g, '\\\\')
  } else {
    sep = '/'
  }
  if (level) {
    return new RegExp(`^${parentPath}(${sep}[^${sep}]+){1,${level}}[^${sep}]+$`)
  } else {
    return new RegExp(`^${parentPath}`)
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
