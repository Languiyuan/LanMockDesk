<template>
  <div class="title-bar flex items-center justify-between h-10 bg-white dark:bg-[#242424] border-b border-gray-200 dark:border-[#333] select-none text-gray-600 dark:text-gray-300">
    <!-- Icon / Title Area -->
    <div class="drag-region flex-1 h-full flex items-center pl-4">
      <img src="/logo.svg" alt="Logo" class="w-5 h-5 mr-2 select-none" />
      <span class="font-semibold text-sm select-none">LanMock Desk</span>
    </div>
    
    <div class="window-controls flex items-center h-full">
      <!-- Theme Switcher -->
      <div class="control-button theme-switch flex items-center justify-center w-10 h-full hover:bg-gray-100 dark:hover:bg-[#333] cursor-pointer" @click="toggleTheme" title="Switch Theme">
        <n-icon size="18">
           <component :is="appConfigStore.theme === 'darkTheme' ? Sunny : Moon" />
        </n-icon>
      </div>
      
      <!-- Minimize -->
      <div class="control-button flex items-center justify-center w-12 h-full hover:bg-gray-100 dark:hover:bg-[#333] cursor-pointer" @click="minimize">
        <n-icon size="18">
          <RemoveOutline />
        </n-icon>
      </div>

      <!-- Maximize/Restore -->
      <div class="control-button flex items-center justify-center w-12 h-full hover:bg-gray-100 dark:hover:bg-[#333] cursor-pointer" @click="maximize">
        <n-icon size="16">
          <SquareOutline />
        </n-icon>
      </div>

      <!-- Close -->
      <div class="control-button close-btn flex items-center justify-center w-12 h-full hover:bg-[#e81123] hover:text-white cursor-pointer" @click="close">
        <n-icon size="20">
          <CloseOutline />
        </n-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui'
import { RemoveOutline, SquareOutline, CloseOutline, Sunny, Moon } from '@vicons/ionicons5'
import { useAppConfig } from '../stores/modules/appConfig'

const appConfigStore = useAppConfig()

const toggleTheme = () => {
  appConfigStore.changeTheme(appConfigStore.theme === 'darkTheme' ? 'lightTheme' : 'darkTheme')
}

const minimize = () => {
  window.ipcRenderer.send('window-minimize')
}

const maximize = () => {
  window.ipcRenderer.send('window-maximize')
}

const close = () => {
  window.ipcRenderer.send('window-close')
}
</script>

<style scoped>
.title-bar {
  -webkit-app-region: drag;
  z-index: 9999; /* Ensure it stays on top */
}

.control-button {
  -webkit-app-region: no-drag;
  transition: background-color 0.2s;
}
</style>
