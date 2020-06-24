<template>
  <div id="wrapper">
    <main>
      <div class="spinner-grow text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <div>Hola {{ envTest }}</div>
    </main>
  </div>
</template>

<script>
import async from 'async'
import Logger from '../../libs/logger'
import fs from 'fs'
import { remote } from 'electron'

export default {
  name: 'landing-page',
  components: {},
  beforeCreate() {
    remote.app.emit('window-show')
  },
  data: function() {
    return {
      dbFolder: '',
      envTest: process.env.CRYPTO_KEY
    }
  },
  created: function() {
    console.log('Hola', process.env.CRYPTO_KEY)
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
