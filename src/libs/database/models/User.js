module.exports = {
  name: 'User',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    email: {
      type: 'varchar'
    },
    token: {
      type: 'text'
    },
    userId: {
      type: 'text'
    },
    mnemonic: {
      type: 'text'
    },
    root_folder_id: {
      type: 'int'
    }
  }
}
