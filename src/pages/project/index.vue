<template>
  <div class="w-screen h-screen">
    <!-- <button class="w-72"  @click="selectFolder">选择文件夹</button>
    <button @click="selectDatabaseFile">选择数据库文件</button>
    <p v-if="selectedFolderPath">选择的文件夹路径: {{ selectedFolderPath }}</p>
    <p v-if="selectedDatabaseFilePath">选择的数据库文件路径: {{ selectedDatabaseFilePath }}</p> -->

    <ProjectList></ProjectList>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { useLinkDB } from '../../hooks/useLinkDB'
import ProjectList from './components/ProjectList.vue';

const { selectedFolderPath, selectedDatabaseFilePath, selectFolder, selectDatabaseFile } = useLinkDB()
</script>

<style lang="scss" scoped>
// .wrapper {
//   width: 100%;
//   height: 100%;
//   background-color: black;
//   padding: 40px;
//   .box {
//     width: 200px;
//     height: 200px;
//     background-color: white;
//   }
// }
</style>