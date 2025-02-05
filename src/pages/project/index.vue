<template>
  <div class="wrapper">
    <button @click="selectFolder">选择文件夹</button>
    <button @click="selectDatabaseFile">选择数据库文件</button>
    <p v-if="selectedFolderPath">选择的文件夹路径: {{ selectedFolderPath }}</p>
    <p v-if="selectedDatabaseFilePath">选择的数据库文件路径: {{ selectedDatabaseFilePath }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

const selectedFolderPath = ref<string | null>(null)
const selectedDatabaseFilePath = ref<string | null>(null)

async function selectFolder() {
  const { canceled, filePaths } = await window.ipcRenderer.invoke('showFolderDialog')
  if (!canceled && filePaths.length > 0) {
    selectedFolderPath.value = filePaths[0]
  }
}

async function selectDatabaseFile() {
  const filePath = await window.ipcRenderer.invoke('showDatabaseFileDialog')
  if (filePath) {
    selectedDatabaseFilePath.value = filePath
  }
}
</script>

<style scoped>
/* @import url(); 引入css类 */

button {
  padding: 10px 20px;
  margin-top: 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}
</style>