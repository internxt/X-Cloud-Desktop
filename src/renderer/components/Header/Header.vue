<template>
    <div>
      <div class="flex justify-between p-4">
        <div>
          <!-- <div>{{Brand}}</div> -->
          <div class="text-gray-800 text-xl font-extrabold">{{appName}}</div>
          <div class="text-sm font-extrabold">{{SubtitleApp}}</div>
        </div>

        <div class="flex items-start">
          <button class="focus:outline-none">
            <UilFolderNetwork class="text-blue-600 cursor-pointer" size="24px" />
          </button>

          <button class="focus:outline-none ml-3">
            <UilSetting class="text-blue-600 cursor-pointer" size="24px"/>
          </button>

          <button class="focus:outline-none ml-3" @click="setIsOpen">
            <UilUserCircle class="text-blue-600 cursor-pointer" size="24px" />
          </button>
        </div>
      </div>


      <!-- <button type="primary" @click="showDrawer">
        Open
      </button>

      <a-drawer       
        title="Basic Drawer"
        :placement="right"
        :closable="false"
        :visible="visible"
        :after-visible-change="afterVisibleChange"
        @close="onClose">
          xxxx
      </a-drawer> -->
    </div>

    
</template>

<script>

import '../Header/Header.scss'
import FolderIcon from '../ExportIcons/FolderIcon'
import ConfigIcon from '../ExportIcons/ConfigIcon'
import { UilFolderNetwork, UilSetting, UilUserCircle } from '@iconscout/vue-unicons'
import 'ant-design-vue/dist/antd.css'
// import { Drawer } from 'ant-design-vue'

export default {
  data() {
    return {
      placement: 'left'
    }
  },
  methods: {
    debug() {
      console.log('uwu')
    },
    afterVisibleChange(val) {
      console.log('visible', val)
    },
    setIsOpen() {
      this.$emit('parentPopme', '')
    }
  },
  name: 'Header',
  props: {
    appName: {
      type: String,
      default: 'Internxt'

    },
    SubtitleApp: {
      type: String,
      default: 'Aplication'
    },
    IconClass: {
      type: String,
      default: ''
    }
  },
  components: {
    FolderIcon,
    ConfigIcon,
    UilSetting,
    UilUserCircle,
    UilFolderNetwork
    // Drawer
  }
}
</script>

