import { ipcMain, dialog, BrowserWindow} from 'electron'
import { createAndInitDatabaseIfNotDbFile, initDatabase } from '../db'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
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

  // 订阅appConfig更新事件 处理文件更新
  ipcMain.on('updateConfigFile', (event, data) => {
    const filePath = path.join(app.getPath('userData'), 'appConfig.json');
    // const appConfig = localStorage.getItem('appConfig');
    if (data) {
      fs.writeFileSync(filePath, data);
      console.log('appConfig.json updated successfully');
    } else {
      console.log('No appConfig found in localStorage, skipping update');
    }
  })
}