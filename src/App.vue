<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { darkTheme, lightTheme } from 'naive-ui'
import { ref } from 'vue'

const theme = ref('lightTheme')
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
