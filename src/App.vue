<script setup lang="ts">
import { NConfigProvider } from 'naive-ui';
import { darkTheme , lightTheme} from 'naive-ui'
</script>

<template>
  <NConfigProvider  :theme="lightTheme">
    <RouterView />
  </NConfigProvider>
</template>


<style>

</style>