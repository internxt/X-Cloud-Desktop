module.exports = {
  name: 'LocalFile',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    name: {
      type: 'varchar'
    },
    path: {
      type: 'text'
    },
    type: {
      type: 'varchar',
      nullable: true
    }
  }
}
