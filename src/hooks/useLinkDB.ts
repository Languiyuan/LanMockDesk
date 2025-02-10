import { ref } from "vue"

export function useLinkDB() {
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

  return {
    selectedFolderPath,
    selectedDatabaseFilePath,
    selectFolder,
    selectDatabaseFile
  }
}