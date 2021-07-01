import Database from '../../../database/index'
import path from 'path'
import fs from 'fs-extra'
import Logger from '../../../libs/logger'

const file = path.dirname(Database.GetDatabaseFolder) + 'selectTree.json'
const selectAction = {
  SELECT: 1,
  DESELECT: 2
}

var root
try {
  if (fs.existsSync(file)) {
    root = JSON.parse(fs.readFileSync(file))
  } else {
    root = { children: [], level: 0 }
  }
} catch (error) {
  Logger.error('Error when loading trie json. ', error)
}

const set = function(path, action) {
  console.log(`path: ${path}, action: ${action}, equals select ${action === selectAction.SELECT}`)
  let node = root
  let sep = '/'
  let lastAction = null
  if (process.platform === 'win32') {
    sep = '\\'
  }
  let level = 0
  for (const l of path.split(sep)) {
    level++
    if (!node.children[l]) {
      node.children[l] = { key: l, children: [], action: null, level: level }
    }
    node = node.children[l]
    if (node.action) {
      lastAction = node.action
    }
  }
  if (lastAction !== action) {
    node.action = action
  }
  node.children = []
}

const generateAction = function() {
  const queue = []
  for (const children in root.children) {
    queue.push(root.children[children])
  }
  const res = []
  let actualPath = ''
  let node
  let lastLevel = 0
  while (queue.length !== 0) {
    node = queue.pop()
    let difference = lastLevel + 1 - node.level
    while (difference > 0) {
      actualPath = path.dirname(actualPath)
      difference--
    }
    actualPath = path.join(actualPath, node.key)
    lastLevel = node.level
    for (const children in node.children) {
      queue.push(node.children[children])
    }
    if (node.action) {
      res.push({ path: actualPath, action: node.action })
    }
  }
  console.log(res)
  return res
}

export default {
  set,
  generateAction,
  selectAction
}
