import { ipcMain, dialog, BrowserWindow} from 'electron'
import { createAndInitDatabaseIfNotDbFile, initDatabase } from '../db'

export function setupHandlers(win: BrowserWindow) {
  // 添加 show-folder-dialog 的 IPC 处理
  ipcMain.handle('showFolderDialog', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    createAndInitDatabaseIfNotDbFile(result.filePaths[0])
    console.log('result',result)
    return result
  })

  // 添加 show-database-file-dialog 的 IPC 处理
  ipcMain.handle('showDatabaseFileDialog', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Database Files', extensions: ['db'] }]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      initDatabase(result.filePaths[0])
      console.log('Database file selected and initialized:', result.filePaths[0])
      return result.filePaths[0]
    }
    return null
  })
}