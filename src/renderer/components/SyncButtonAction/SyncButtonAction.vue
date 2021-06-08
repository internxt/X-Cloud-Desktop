<template>
    <div class="pb-2">
        <div>
          <div class="relative">

            <div class="absolute -top-7 centerAbsolute">
              <div class="justify-center">
                <div class="flex justify-center">
                  <div class="flex mb-2" v-if="syncState === true">

                    <div class="flex mb-4">
                      <div @click="forceSync()">
                        <UilCloudDataConnection class="w-10 h-10 fill-current text-white bg-blue-600 text-3xl p-2 rounded-full cursor-pointer hover:bg-indigo-900 shadow-2xl transition duration-500 ease-in-out"/>
                        <div class="text-xs text-blue-600 mt-1">Full sync</div>
                      </div>
                    </div>

                  </div>

                  <div v-else>
                      <div class="bg-blue-300 rounded-full p-2.5 w-10 h-10 mr-2">
                        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <div class="text-xs text-blue-600 mt-1">Synchronizing...</div>
                      </div>


                  </div>

                </div>
              </div>
            </div>

            <div v-if="syncState === true" class="text-xs text-gray-500 text-center pt-10 mt-4">
              Synchronizing...
            </div>
            <div class="text-xs text-gray-500 text-center pt-10 mt-4" v-else>
                Not synchronizations yet. Start on click <span class="text-blue-600">Full sync</span> button
            </div>

          </div>
        </div>



    </div>
</template>
<script>

import { UilCloudDataConnection } from '@iconscout/vue-unicons'
import ConfigStore from '../../../main/config-store'
import './SyncButtonAction.scss'

const remote = require('@electron/remote')

export default ({
  data() {
    return {
      syncState: false
    }
  },
  methods: {
    cambiarEstado() {

    },
    debug() {
      // console.log(appName)
    },
    forceSync() {
      remote.app.emit('sync-start')
      this.syncState = true
      console.log(this.syncState)
    },
    StopForceSync() {
      remote.app.on('sync-off', (_) => {
        // TODO
      })
      return console.log('hola')
    }
  },
  updateSyncButton(syncState) {
    console.log('SYNCSTATE', syncState)
    this.isSyncing = syncState
  },
  created: function() {
    remote.app.on('sync-off', (isSyncing) => {
      this.syncState = isSyncing
      console.log(this.syncState)
    })
    remote.app.on('sync-stop', (isSyncing) => {
      this.syncState = isSyncing
      console.log(this.syncState)
    })
    // remote.app.on('sync-on', (isSyncing) => {
    //   this.syncState = isSyncing
    //   console.log(this.syncState)
    // })
    console.log('sale', ConfigStore.get('stopSync'))
  },
  updated: function() {
    console.log('entra', ConfigStore.get('stopSync'))
  },
  computed: {

  },
  name: 'SyncButtonAction',
  props: {

  },
  components: {
    UilCloudDataConnection
  }
})
</script>
