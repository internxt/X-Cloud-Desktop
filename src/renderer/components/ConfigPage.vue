<template>
  <div id="wrapper">
    <main>
      <div class="config-container">
        <p>Choose folder to sync</p>
        <input type="text" v-model="storagePath" class="form-control" />
        <button
          @click="chooseFolder()"
          class="form-control btn-block btn-primary"
        >
          Choose folder
        </button>

        <div
          v-if="this.folderExists(storagePath) && !folderIsEmpty"
          class="alert alert-danger"
          role="alert"
        >
          This folder is not empty. Please, clear its contents or select another
          folder
        </div>

        <button
          class="form-control btn btn-block btn-info"
          @click="configure"
          :disabled="!storagePath || !isEmptyFolder(storagePath)"
        >
          Continue
        </button>
      </div>
    </main>
  </div>
</template>

<script>
import fs from 'fs'
import database from '../../database'
const remote = require('@electron/remote')

export default {
  name: 'config-page',
  data() {
    return {
      storagePath: '',
      folderIsEmpty: true
    }
  },
  components: {},
  created: function () {},
  methods: {
    chooseFolder() {
      const path = remote.dialog.showOpenDialog({
        properties: ['openDirectory']
      })
      if (path && path[0]) {
        this.$data.storagePath = path[0]
        this.$data.folderIsEmpty = this.isEmptyFolder(path[0])
      }
    },
    isEmptyFolder(path) {
      if (!fs.existsSync(path)) {
        return true
      } else {
        const filesInFolder = fs.readdirSync(path)
        return filesInFolder.length === 0
      }
    },
    folderExists(path) {
      return fs.existsSync(path)
    },
    configure() {
      database.Set('xPath', this.$data.storagePath)
      this.$router.push('/xcloud')
    }
  }
}
</script>

<style scoped>
.config-container {
  margin: 10px;
}

.config-container p {
  margin-top: 20px;
}
</style>