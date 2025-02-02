import { ipcMain, dialog, BrowserWindow} from 'electron'

export function setupHandlers(win: BrowserWindow) {
  // 添加 show-folder-dialog 的 IPC 处理
  ipcMain.handle('showFolderDialog', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    return result
  })

  // 可以在这里添加其他 IPC 处理函数
}