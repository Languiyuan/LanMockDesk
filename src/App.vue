<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui'
import { darkTheme, lightTheme } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { useAppConfig } from './stores/modules/appConfig'

const appConfigStore = useAppConfig()
console.log(appConfigStore)
const theme = computed(() => appConfigStore.theme)
onMounted(() => {
  // appConfigStore.changeTheme('darkTheme');
  // appConfigStore.changeTheme('darkTheme'); // 这会触发 setItem
  window.ipcRenderer.on('app-config', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args)
  const config = args[0]
  config.theme && appConfigStore.changeTheme(config.theme)
  config.projectList && appConfigStore.setProjectList(config.projectList)
})
})

// setInterval(() => {
//   appConfigStore.changeTheme(theme.value === 'darkTheme' ? 'lightTheme' : 'darkTheme')
// }, 4000)

</script>

<template>
  <div
    class="h-screen w-screen"
    :style="{ backgroundColor: theme === 'darkTheme' ? '#242424' : '#ffffff' }"
  >
    <NConfigProvider :theme="theme === 'darkTheme' ? darkTheme : lightTheme">
      <NMessageProvider>
        <RouterView />
      </NMessageProvider>
    </NConfigProvider>
  </div>
</template>

<style></style>