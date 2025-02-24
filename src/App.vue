<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { darkTheme, lightTheme } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { useAppConfig } from './stores/modules/appConfig'

const appConfigStore = useAppConfig()
console.log(appConfigStore)
const theme = computed(() => appConfigStore.theme)
onMounted(() => {
  // appConfigStore.changeTheme('darkTheme');
  // appConfigStore.changeTheme('darkTheme'); // 这会触发 setItem
})

setInterval(() => {
  appConfigStore.changeTheme(theme.value === 'darkTheme' ? 'lightTheme' : 'darkTheme')
}, 4000)

</script>

<template>
  <div
    class="h-screen w-screen"
    :style="{ backgroundColor: theme === 'darkTheme' ? '#242424' : '#ffffff' }"
  >
    <NConfigProvider :theme="theme === 'darkTheme' ? darkTheme : lightTheme">
      <RouterView />
    </NConfigProvider>
  </div>
</template>

<style></style>