<template>
  <div id="wrapper">
    <main class="centered-container">
      <div class="spinner-grow text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <div><a href="" @click="clearDatabase()">Clear data</a></div>
    </main>
  </div>
</template>

<script>
import SystemInformation from './LandingPage/SystemInformation'
import database from '../../database'
import async from 'async'
import Logger from '../../libs/logger'
import fs from 'fs'
const remote = require('@electron/remote')

export default {
  name: 'landing-page',
  components: { SystemInformation },
  beforeCreate() {
    remote.app.emit('window-hide')
  },
  data: function () {
    return {
      dbFolder: ''
    }
  },
  created: async function () {
    const xUser = await database.Get('xUser')
    // const xPath = await database.Get('xPath')
    this.$data.dbFolder = database.GetDatabaseFolder
    if (!xUser) {
      Logger.info('No xUser is set on database')

      await database.ClearFolders()
      await database.ClearFiles()
      await database.ClearTemp()
      await database.ClearLastFiles()
      await database.ClearLastFolders()
      await database.ClearUser()
      await database.compactAllDatabases()

      this.$router.push('/login').catch(() => {})
    } else {
      // Check if token is valid
      this.$router.push('/xcloud').catch(() => {})
    }
  },
  methods: {
    opend(link) {
      this.$electron.shell.openExternal(link)
    },
    clearDatabase() {
      const confirmation = confirm(
        'ATTENTION:\nAll your Internxt Drive data will be lost forever.\n\nContinue?'
      )
      if (confirmation) {
        async.waterfall(
          [
            (next) => {
              database.dbFiles.remove({}, { multi: true }, (err, n) =>
                next(err, n)
              )
            },
            (next) => {
              database.dbFolders.remove({}, { multi: true }, (err, n) =>
                next(err, n)
              )
            },
            (next) => {
              database.dbUser.remove({}, { multi: true }, (err, n) =>
                next(err, n)
              )
            }
          ],
          (err, result) => {
            if (err) {
              alert('Error clearing database\n\n' + err)
            } else {
              this.$router.push('/login').catch(() => {})
            }
          }
        )
      }
    }
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css?family=Source+Sans+Pro');
</style>
