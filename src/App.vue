<script setup lang="ts">
import { NConfigProvider, NMessageProvider, NDialogProvider } from 'naive-ui'
import { darkTheme, lightTheme } from 'naive-ui'
import { computed, onMounted, watch } from 'vue'
import { useAppConfig } from './stores/modules/appConfig'
import { AppConfig } from './stores/interface/index';

const appConfigStore = useAppConfig()
console.log(appConfigStore)
const theme = computed(() => appConfigStore.theme)

watch(theme, (val) => {
  if (val === 'darkTheme') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, { immediate: true })

onMounted(() => {
  // appConfigStore.changeTheme('darkTheme');
  // appConfigStore.changeTheme('darkTheme'); // 这会触发 setItem
  window.ipcRenderer.on('app-config', (_event, ...args) => {
  console.log('[Receive Main-process message]:', ...args)
  const config: AppConfig = args[0]
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
    class="h-screen w-screen bg-white dark:bg-[#242424]"
  >
    <NConfigProvider :theme="theme === 'darkTheme' ? darkTheme : lightTheme">
      <NMessageProvider>
        <NDialogProvider>
          <RouterView />
        </NDialogProvider>
      </NMessageProvider>
    </NConfigProvider>
  </div>
</template>

<style></style>