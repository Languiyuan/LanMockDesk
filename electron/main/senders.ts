import { BrowserWindow} from 'electron'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { ensureDatabaseInitialized } from '../db'

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
        config.projectList = config.projectList.map((project: any) => {
          const exists = project.dbPath && fs.existsSync(project.dbPath);
          let isFile = false;
          if (exists) {
            try {
              isFile = fs.statSync(project.dbPath).isFile();
            } catch { }
          }
          if (isFile) {
              // Initialize DB connection for Mock Server
              try {
                  ensureDatabaseInitialized(project.dbPath);
              } catch (e) {
                  console.error(`Failed to init DB at ${project.dbPath}`, e);
              }
          }
          return {
            ...project,
            status: isFile ? 2 : 3
          }
        })
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
