<template>
  <div class="bg-white rounded-t-2xl p-4 px-6 h-48 fileStatusBox overflow-scroll">
      <!-- {{this.statusFile()}} -->
      {{ this.AllfilesShow() }}
    <div v-if="FileStatusSync.length > 0">
      <div class="text-base text-black font-bold mb-3">File status</div>
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
            <div class="flex mb-2" v-if="item.state === 'success' || !item.state">
              <UilFileCheckAlt
                class="text-2xl mr-3 fill-current text-green-500"
              />
              <div>
                <div v-if="item.filename.length < 30">{{ item.filename }}</div>
                <div v-if="item.filename.length >= 30">{{ item.filename.substr(0,30) }}...</div>
                <div class="text-xs text-gray-500"> 
                  File successfully synchronized
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
                  <span class="text-red-500">0%</span> Error
                  file upload. Try again
                </div>
              </div>
            </div>

            <div class="flex mb-2" v-if="!item.state">
              <UilFileUpload class="text-2xl mr-3 fill-current text-blue-400" />
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-gray-500">
                  <span class="text-red-500">{{ formatNumberPercent(item.progress) }} %</span> 
                    Start Synchronizing file...
                  </div>
              </div>
            </div>

            <div class="flex mb-2" v-if="item.action === 'remove'">
              <UilFileTimes class="text-2xl mr-3 fill-current text-red-500"/>
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-red-500">
                      File removed
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center w-full h-full">
      <!-- <CircleWithCloud :width="65" :height="65"/> -->
      <img src="../../assets/svg/start-sync-button.svg" />
    </div>
  </div>
</template>
<script>
import {
  UilFileCheckAlt,
  UilFileUpload,
  UilFileExclamation,
  UilFileBlank,
  UilFileTimes
} from '@iconscout/vue-unicons'
import FileLogger from '../../logic/FileLogger'
import './FileStatus'
import CircleWithCloud from '../ExportIcons/CircleWithCloud'
import ConfigStore from '../../../main/config-store'

const { app } = require('@electron/remote')
// window.FileLogger = FileLogger

export default {
  data() {
    return {
      test: {},
      FileStatusSync: [],
      loading: false
    }
  },
  created() {
  },
  mounted: function () {
  },
  updated: function () {
    this.AllfilesShow()
  },
  destroyed: function () {
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
        FileLogger.on('update-last-entry', console.log('ITEM', item))
        const newArray = [item, ...this.FileStatusSync]
        this.FileStatusSync = newArray
        return this.FileStatusSync
      })
    },
    AllfilesShow() {
      FileLogger.on('new-emit', (item) => {
        this.FileStatusSync = item
        return this.FileStatusSync
      })
    }
  },
  name: 'FileStatus',
  props: {},
  components: {
    UilFileCheckAlt,
    UilFileUpload,
    UilFileExclamation,
    UilFileBlank,
    CircleWithCloud,
    UilFileTimes
  }
}
</script>
