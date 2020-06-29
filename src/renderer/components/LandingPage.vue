<template>
  <div id="wrapper">
    <main>
      <div class="spinner-grow text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </main>
  </div>
</template>

<script>
import async from 'async'
import Logger from '../../libs/logger'
import fs from 'fs'
import { remote } from 'electron'
import checkEnvVars from '../../libs/envs'
import GetInstance from '../../libs/database'

export default {
  name: 'landing-page',
  components: {},
  beforeCreate() {
    remote.app.emit('window-show')
  },
  data: function() {
    return {
      dbFolder: ''
    }
  },
  created: function() {
    console.log('Checking env vars')
    if (!checkEnvVars()) {
      alert('Failed to load ENV vars')
    } else {
      GetInstance().then(con => {
        con.User.find().then(results => {
          if (results.length === 0) {
            this.$router.push('/login')
          } else {
            this.$router.push('/xcloud')
          }
        })
      })
    }
  },
  methods: {}
}
</script>

<style>
#wrapper {
  justify-content: center;
}
</style>
