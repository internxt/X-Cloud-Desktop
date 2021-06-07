<template>
  <div class="bg-white rounded-t-2xl p-4 h-48 fileStatusBox overflow-scroll">
    <div class="subTitle font-semibold mb-3">File status</div>
    <div>
      <!-- {{this.statusFile()}} -->
      {{ this.AllfilesShow() }}
      <div class="mb-1">
        <div
          class=""
          v-for="(item, index) in FileStatusSync"
          v-bind:key="index"
        >
          <div class="flex mb-2" v-if="item.progress < 100">
            <UilFileUpload class="text-2xl mr-3 fill-current text-gray-300" />
            <div>
              <div>{{ item.filename }}</div>
              <div class="text-xs text-gray-500">
                <span class="text-green-500">{{ formatNumberPercent(item.progress) }} %</span>
                Synchronizing file upload
              </div>
            </div>
          </div>
          <div v-if="item.progress >= 100">
            <div class="flex mb-2" v-if="item.state === 'success'">
              <UilFileCheckAlt
                class="text-2xl mr-3 fill-current text-green-500"
              />
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-gray-500">
                  <span class="text-green-500">{{ formatNumberPercent(item.progress) }} %</span> File
                  successfully synchronized
                </div>
              </div>
            </div>

            <div class="flex mb-2" v-if="item.state === 'error'">
              <UilFileExclamation
                class="text-2xl mr-3 fill-current text-red-500"
              />
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-gray-500">
                  <span class="text-red-500">{{ formatNumberPercent(item.progress) }} %</span> Error
                  file upload. Try again
                </div>
              </div>
            </div>

            <div class="flex mb-2" v-if="!item.state">
              <UilFileUpload class="text-2xl mr-3 fill-current text-blue-400" />
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-gray-500">
                  <span class="text-red-500">{{ formatNumberPercent(item.progress) }} %</span> Start
                  Synchronizing file...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import {
  UilFileCheckAlt,
  UilFileUpload,
  UilFileExclamation,
  UilFileBlank
} from '@iconscout/vue-unicons'
import FileLogger from '../../logic/FileLogger'
import './FileStatus'

// FileLogger.on('update-last-entry', (item) => console.log('LAST-ENTRY', item))
// FileLogger.on('update-last-entry',(item) => console.log('HERE', item))
FileLogger.on('update-last-entry', (item) =>
  console.log('update-last-entry', FileLogger.getAll)
)

export default {
  data() {
    return {
      test: {},
      FileStatusSync: []
    }
  },
  created() {
    console.log('Entrar')
    // this.AllfilesShow()
  },
  mounted: function () {
    console.log('Montado')
  },
  updated: function () {
    console.log('Actualizado')
    this.AllfilesShow()
  },
  destroyed: function () {
    console.log('destroy')
  },
  methods: {
    formatNumberPercent(value) {
      var formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0
      })
      return formatter.format(value)
    },
    statusFile() {
      FileLogger.on('update-last-entry', (item) => {
        this.test = item
        return this.test
      })
      return console.log('DATA', this.test)
    },
    AllfilesShow() {
      FileLogger.on('new-emit', (item) => {
        this.FileStatusSync = item
        return this.FileStatusSync
      })
      return console.log('new-emit', this.FileStatusSync)
    }
  },
  name: 'FileStatus',
  props: {},
  components: {
    UilFileCheckAlt,
    UilFileUpload,
    UilFileExclamation,
    UilFileBlank
  }
}
</script>
