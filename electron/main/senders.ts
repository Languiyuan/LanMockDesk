import { BrowserWindow} from 'electron'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export function initAppConfig(win: BrowserWindow) {
  // 读取 appConfig.json 文件
  const userDataPath = app.getPath('userData')
  const appConfigPath = path.join(userDataPath, 'appConfig.json')
  let appConfig = { theme: 'lightTheme', projectList: [] }
  if (fs.existsSync(appConfigPath)) {
    try {
      const data = fs.readFileSync(appConfigPath, 'utf8')
      appConfig = JSON.parse(data)
    } catch (error) {
      console.error('Failed to read appConfig.json:', error)
    }
  }
    // 发送 appConfig 到渲染进程
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('app-config', appConfig)
    })
}