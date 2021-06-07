<template>
    <div class="pb-2">
        <div>
          <div class="relative">

            <div class="absolute -top-3 centerAbsolute">
              <div class="justify-center">
                <div class="flex justify-center">
                  <div @click="forceSync()"><UilCloudDataConnection class="fill-current text-white bg-blue-600 text-3xl p-1.5 rounded-full cursor-pointer hover:bg-indigo-900 shadow-2xl transition duration-500 ease-in-out"/></div>
                </div>
                <div class="flex justify-center">
                  <div class="text-xs text-blue-600 mt-1">Full sync</div>
                </div>
              </div>
            </div>

          </div>
        </div>


        <div class="text-xs text-gray-500 text-center pt-12">
          Not synchronizations yet. Start on click <span class="text-blue-600">Full sync</span> button
        </div>

    </div>
</template>
<script>

import { UilCloudDataConnection } from '@iconscout/vue-unicons'
import './SyncButtonAction.scss'

const remote = require('@electron/remote')

export default ({
  methods: {
    debug() {
      // console.log(appName)
    },
    forceSync() {
      remote.app.emit('sync-start')
    }
  },
  name: 'SyncButtonAction',
  props: {

  },
  components: {
    UilCloudDataConnection
  }
})
</script>
