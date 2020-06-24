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
    if (!checkEnvVars()) {
      alert('Failed to load ENV vars')
    } else {
      this.$router.push('/login')
    }
  },
  methods: {

  }
}
</script>

<style>
#wrapper {
  display: flex;
  justify-content: center;
}
</style>
