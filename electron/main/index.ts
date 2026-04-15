import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fastify, { FastifyInstance } from 'fastify'
import { dbConnections, initDatabase, matchApi, getProjectList, getAllProjects } from '../db'
import { setupHandlers } from './handlers'
import { initAppConfig } from './senders'
import { isProjectEnabled } from './mockProjectSwitch'
import Mock from 'mockjs'
import axios from 'axios'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')


async function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    frame: false,
    width: 1200,
    height: 800,
    minWidth: 940,
    minHeight: 500,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })
  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Remove application menu
  Menu.setApplicationMenu(null)

  // Window controls IPC
  ipcMain.on('window-minimize', () => {
    win?.minimize()
  })
  ipcMain.on('window-maximize', () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('window-close', () => {
    win?.close()
  })

  // 初始化appConfig
  initAppConfig(win)

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  // 启动 Fastify 服务器
  const server: FastifyInstance = fastify({ logger: true })

  server.all('/*', async (request, reply) => {
    const url = request.url;
    const method = request.method;
    
    console.log(`[MockServer] Received request: ${method} ${url}`);

    // 1. Identify Project
    const projects = getAllProjects();
    let matchedProject: any = null;
    let relativeUrl = '';
    let hasMatchedPrefixButDisabled = false

    for (const project of projects) {
        if (!project.base_url || !project.sign) continue
        const signPart = `${project.sign}`.startsWith('/') ? `${project.sign}` : `/${project.sign}`
        const basePart = `${project.base_url}`.startsWith('/') ? `${project.base_url}` : `/${project.base_url}`
        const prefix = `${signPart}${basePart}`

        if (url.startsWith(prefix)) {
            if (!isProjectEnabled({ dbPath: project.dbPath, projectId: project.id })) {
                hasMatchedPrefixButDisabled = true
                continue
            }
            matchedProject = project;
            relativeUrl = url.substring(prefix.length);
            if (!relativeUrl.startsWith('/')) relativeUrl = '/' + relativeUrl;
            // Handle root case if prefix is same as url
            if (url === prefix) relativeUrl = '/';
            break;
        }
    }

    if (!matchedProject) {
         if (hasMatchedPrefixButDisabled) {
           return reply.code(403).send({ error: '项目未启用，请在左侧项目列表打开开关' });
         }
         return reply.code(404).send({ error: 'No project matched for this URL' });
    }

    console.log(`[MockServer] Matched Project: ${matchedProject.name}, Relative URL: ${relativeUrl}`);

    // 2. Match API
    const api = matchApi(matchedProject.dbPath, relativeUrl, method);

    if (api) {
        // 3. Mock Response
        console.log(`[MockServer] Matched API: ${api.name}`);
        
        if (api.responseDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, api.responseDelay));
        }

        try {
            const template = JSON.parse(api.content || '{}');
            const data = Mock.mock(template);
            return reply.send(data);
        } catch (e) {
            console.error('[MockServer] Mock generation failed', e);
            return reply.code(500).send({ error: 'Mock generation failed' });
        }
    } else {
        // 4. Proxy (if enabled)
        // Check if proxyInfo exists
        // proxyInfo structure: JSON string { "target": "http://...", "enabled": true, ... }
        // Or simple string target? Let's assume JSON or string.
        // Based on doc: proxyInfo VARCHAR(2000).
        // Let's assume it's a JSON string with target.
        
        let target = '';
        if (matchedProject.proxyInfo) {
            try {
                 // Try parsing as JSON first
                 const proxyConfig = JSON.parse(matchedProject.proxyInfo);
                 if (proxyConfig.target) target = proxyConfig.target;
            } catch {
                 // Assume it is the target URL string
                 target = matchedProject.proxyInfo;
            }
        }

        if (target) {
             console.log(`[MockServer] Proxying to ${target}${relativeUrl}`);
             try {
                 const targetUrl = new URL(relativeUrl, target).href;
                 // Forward request
                 const response = await axios({
                     method: method as any,
                     url: targetUrl,
                     headers: request.headers as any,
                     data: request.body,
                     validateStatus: () => true // Do not throw on error status
                 });
                 
                 // Copy headers
                 for (const [key, value] of Object.entries(response.headers)) {
                     reply.header(key, value);
                 }
                 
                 return reply.code(response.status).send(response.data);
             } catch (e) {
                 console.error('[MockServer] Proxy failed', e);
                 return reply.code(502).send({ error: 'Proxy failed', details: (e as any).message });
             }
        }
        
        return reply.code(404).send({ error: 'API not found and no proxy configured' });
    }
  })

  server.listen({ port: 4399, host: '127.0.0.1' }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    console.log(`Server is running on ${address}`)
  })

  // 设置 IPC 处理函数
  setupHandlers(win!)
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
// ipcMain.handle('open-win', (_, arg) => {
//   const childWindow = new BrowserWindow({
//     webPreferences: {
//       preload,
//       nodeIntegration: true,
//       contextIsolation: false,
//     },
//   })

//   if (VITE_DEV_SERVER_URL) {
//     childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
//   } else {
//     childWindow.loadFile(indexHtml, { hash: arg })
//   }
// })
