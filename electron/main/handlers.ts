import { ipcMain, dialog, BrowserWindow} from 'electron'
import { createAndInitDatabaseIfNotDbFile } from '../db'

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

  // 可以在这里添加其他 IPC 处理函数
}