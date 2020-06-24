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

export default {
  name: 'landing-page',
  components: {},
  beforeCreate() {
  },
  data: function() {
    return {
      dbFolder: ''
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
