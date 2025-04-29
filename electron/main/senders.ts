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
      const config = JSON.parse(data)
      // 更新项目状态
      if (config.projectList) {
        config.projectList = config.projectList.map(project => ({
          ...project,
          status: project.dbPath && fs.existsSync(project.dbPath) ? 2 : 3
        }))
      }
      appConfig = config
    } catch (error) {
      console.error('Failed to read appConfig.json:', error)
    }
  }
  // 发送 appConfig 到渲染进程
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('app-config', appConfig)
  })
}