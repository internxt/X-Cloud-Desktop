<template>
  <div
    class="bg-white rounded-t-2xl p-4 px-6 h-48 fileStatusBox overflow-scroll"
  >
  <div class="flex justify-between">
    <div class="text-base text-black font-bold">File status</div>
    <div class="py-1"><span class="p-1 px-2 bg-blue-600 text-white text-xs rounded-full cursor-pointer hover:bg-blue-900">clear</span></div>
  </div>

    <div v-if="this.FileStatusSync.length > 0">
      <div class="mb-1">
        <div
          class=" mt-4"
          v-for="(item, index) in FileStatusSync"
          v-bind:key="index"
        >
          <!-- {{ En progreso upload entra aquí }} -->
          <div
            class="flex mb-2"
            v-if="item.state == null && (item.action === 'upload' || item.action === 'encrypt')"
          >
            <UilFileUpload
              class="text-2xl mr-3 fill-current text-gray-500"
            />
            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                {{ item.progress ? item.progress + '%' : '' }} File uploading
              </div>
            </div>
          </div>

          <!-- {{ En progreso download entra aquí }} -->
          <div
            class="flex mb-2"
            v-if="!item.state && item.action === 'download'"
          >
            <UilFileDownload class="text-2xl mr-3 fill-current text-gray-500" />

            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                {{ item.progress ? item.progress + '%' : '' }} File downloading
              </div>
            </div>
          </div>

          <!-- {{ Upload success }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'success' && item.action === 'upload'"
          >
            <UilFileCheckAlt
              class="text-2xl mr-3 fill-current text-green-500"
            />
            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                File successfully uploaded
              </div>
            </div>
          </div>

          <!-- {{ Download success }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'success' && item.action === 'download'"
          >
            <UilFileDownload
              class="text-2xl mr-3 fill-current text-green-500"
            />
            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                File successfully downloaded
              </div>
            </div>
          </div>

          <!-- {{ Download Error }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'error' && item.action === 'download'"
          >
            <UilFileExclamation
              class="text-2xl mr-3 fill-current text-red-500"
            />
            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                <div class="text-red-500">
                  Error downloading file. Try again.
                </div>
              </div>
            </div>
          </div>

          <!-- {{ Upload Error }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'error' && item.action === 'upload'"
          >
            <UilFileExclamation
              class="text-2xl mr-3 fill-current text-red-500"
            />
            <div>
              <div>{{ item.filename }}</div>
              <div class="text-xs text-gray-500">
                <div class="text-red-500">Error uploading file. Try again</div>
              </div>
            </div>
          </div>

          <!-- {{ Remove Error }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'error' && item.action === 'remove'"
          >
            <UilFileMinusAlt class="text-2xl mr-3 fill-current text-red-500" />
            <div>
              <div class="text-gray-500">
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                <div class="text-red-500">Error file upload. Try again</div>
              </div>
            </div>
          </div>

          <!-- {{ Remove Sccess }} -->
          <div
            class="flex mb-2"
            v-if="item.state === 'success' && item.action === 'remove'"
          >
            <UilFileMinusAlt class="text-2xl mr-3 fill-current text-gray-500" />
            <div>
              <div>
                {{ item.filename }}
              </div>
              <div class="text-xs text-gray-500">
                <div class="text-red-500">File removed successfully</div>
              </div>
            </div>
          </div>

          <!-- <div class="flex mb-2" v-if="!item.state && item.action === 'upload'">
              <UilFileUpload class="text-2xl mr-3 fill-current text-gray-400" />
              <div>
                <div>{{ item.filename }}</div>
                <div class="text-xs text-gray-500">
                  <span class="text-gray-500">{{ formatNumberPercent(item.progress) }} %</span>
                    Start Synchronizing file...
                  </div>
              </div>
            </div> -->
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center w-full h-full">
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
  UilFileTimes,
  UilFileDownload,
  UilFileMinusAlt
} from '@iconscout/vue-unicons'
import './FileStatus'
import CircleWithCloud from '../ExportIcons/CircleWithCloud'

export default {
  data() {
    return {
      test: {},
      loading: false
    }
  },
  props: {
    FileStatusSync: {
      type: Array,
      required: false
    }
  },
  created() {},
  beforeDestroy: function () {},
  mounted: function () {},
  updated: function () {},
  destroyed: function () {},
  methods: {
    formatNumberPercent(value) {
      var formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0
      })
      return formatter.format(value)
    }
  },
  name: 'FileStatus',
  components: {
    UilFileCheckAlt,
    UilFileUpload,
    UilFileExclamation,
    UilFileBlank,
    CircleWithCloud,
    UilFileTimes,
    UilFileDownload,
    UilFileMinusAlt
  }
}
</script>
