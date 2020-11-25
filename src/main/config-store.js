import Store from 'electron-store'

/**
 * Global user config file
 */

const schema = {
  syncMode: {
    type: 'string',
    default: 'two-way'
  },
  limit: {
    type: 'number',
    default: -1
  },
  usage: {
    type: 'number',
    default: -1
  }
}

const ConfigStore = new Store({ schema: schema })

export default ConfigStore
