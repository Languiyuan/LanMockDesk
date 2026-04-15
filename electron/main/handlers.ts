import { ipcMain, dialog, BrowserWindow} from 'electron'
import { 
  createAndInitDatabaseIfNotDbFile, 
  ensureDatabaseInitialized,
  getProjectList,
  createProject,
  updateProject,
  deleteProject,
  getApiList,
  createApi,
  updateApi,
  deleteApi,
  createApis,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  checkApisExistence,
  batchImportApis,
  ensureFolders
} from '../db'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import { setProjectEnabled } from './mockProjectSwitch'
import { buildFullPathForSpec, buildMockContentFromOperation, buildRequestParamTree, buildResponseParamTree } from './swaggerMock'

async function parseSwagger(swagger: any, projectId: number, dbPath: string, baseUrl: string = '') {
    const apis: any[] = [];
    if (!swagger) return apis;

    let prefix = baseUrl ? baseUrl.trim() : '';
    if (prefix && !prefix.startsWith('/')) {
        prefix = '/' + prefix;
    }
    const parsedDocs = swagger
    if (!parsedDocs?.paths) return apis;

    const allTags = new Set<string>()

    if (swagger.tags && Array.isArray(swagger.tags)) {
        swagger.tags.forEach((tag: any) => {
            if (tag && tag.name) {
                allTags.add(tag.name)
            }
        })
    }

    // Path tags
    for (const methods of Object.values(parsedDocs.paths)) {
        for (const detail of Object.values(methods as any)) {
             const tags = (detail as any).tags
             if (tags && Array.isArray(tags)) {
                 tags.forEach(t => allTags.add(t))
             }
        }
    }
    
    console.log('Ensuring folders for tags:', Array.from(allTags))
    let folderMap = new Map<string, number>()
    try {
        folderMap = ensureFolders(dbPath, Array.from(allTags))
        console.log('Folders ensured, map size:', folderMap.size)
    } catch (e) {
        console.error('Failed to ensure folders', e)
    }

    for (const [url, methods] of Object.entries(parsedDocs.paths)) {
        const fullPath = buildFullPathForSpec(swagger, url)
        let apiPath = fullPath
        if (prefix && prefix !== '/') {
             if (!apiPath.startsWith(prefix)) {
                 continue;
             }
             apiPath = apiPath.substring(prefix.length);
             if (!apiPath.startsWith('/')) {
                 apiPath = '/' + apiPath;
             }
        } else {
             if (!apiPath.startsWith('/')) {
                 apiPath = '/' + apiPath;
             }
        }

        for (const [method, detail] of Object.entries(methods as any)) {
            const d = detail as any
            const name = d.summary || d.operationId || apiPath;
            const content = buildMockContentFromOperation(swagger, d)
            const request = buildRequestParamTree(swagger, d)
            const response = buildResponseParamTree(swagger, d)

            // Catalog ID
            let catalogId = null
            if (d.tags && d.tags.length > 0) {
                const tag = d.tags[0]
                if (folderMap.has(tag)) {
                    catalogId = folderMap.get(tag)
                }
            }

            apis.push({
                projectId,
                catalogId,
                name: name.substring(0, 50),
                url: apiPath,
                method: method.toUpperCase(),
                content,
                responseDelay: 0,
                isOpen: true,
                description: d.description || '',
                paramCheckStatus: 'close',
                paramJson: JSON.stringify({ request, response })
            });
        }
    }
    return apis;
}

export function setupHandlers(win: BrowserWindow) {
  // 添加 show-folder-dialog 的 IPC 处理
  ipcMain.handle('showFolderDialog', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (!result.canceled && result.filePaths.length > 0) {
        const dbPath = createAndInitDatabaseIfNotDbFile(result.filePaths[0])
        return { ...result, dbPath }
    }
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
      ensureDatabaseInitialized(result.filePaths[0])
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

  // Project IPC
  ipcMain.handle('getProjectList', (_, dbPath) => getProjectList(dbPath))
  ipcMain.handle('createProject', (_, { dbPath, project }) => createProject(dbPath, project))
  ipcMain.handle('updateProject', (_, { dbPath, project }) => updateProject(dbPath, project))
  ipcMain.handle('deleteProject', (_, { dbPath, id }) => deleteProject(dbPath, id))
  ipcMain.handle('setProjectEnabled', (_, { dbPath, projectId, enabled }) => {
    setProjectEnabled({ dbPath, projectId }, !!enabled)
    return { success: true }
  })

  // Api IPC
  ipcMain.handle('getApiList', (_, { dbPath, projectId }) => getApiList(dbPath, projectId))
  ipcMain.handle('createApi', (_, { dbPath, api }) => createApi(dbPath, api))
  ipcMain.handle('updateApi', (_, { dbPath, api }) => updateApi(dbPath, api))
  ipcMain.handle('deleteApi', (_, { dbPath, id }) => deleteApi(dbPath, id))

  ipcMain.handle('getFolders', (_, dbPath) => getFolders(dbPath))
  ipcMain.handle('createFolder', (_, { dbPath, name }) => createFolder(dbPath, name))
  ipcMain.handle('updateFolder', (_, { dbPath, id, name }) => updateFolder(dbPath, id, name))
  ipcMain.handle('deleteFolder', (_, { dbPath, id }) => deleteFolder(dbPath, id))

  // Swagger Import IPC
  ipcMain.handle('pickAndParseSwagger', async (_, { dbPath, projectId }) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (canceled || filePaths.length === 0) return { success: false, message: 'Canceled' }

    try {
        console.log('Reading file:', filePaths[0])
        const content = fs.readFileSync(filePaths[0], 'utf-8')
        const swagger = JSON.parse(content)
        
        // Fetch project info to get baseUrl
        const projects = getProjectList(dbPath) as any[];
        const project = projects.find((p: any) => p.id === projectId);
        const baseUrl = project ? project.base_url : '';
        
        console.log('Swagger content parsed, starting parseSwagger with baseUrl:', baseUrl)
        const apis = await parseSwagger(swagger, projectId, dbPath, baseUrl)
        console.log('parseSwagger result length:', apis.length)
        
        if (apis.length === 0) {
            return { success: false, message: 'No valid APIs found in Swagger file' }
        }

        // Check for duplicates
        const checkedApis = checkApisExistence(dbPath, projectId, apis)
        
        return { success: true, apis: checkedApis }
    } catch (e) {
        console.error('Parse failed', e)
        return { success: false, message: (e as any).message }
    }
  })

  ipcMain.handle('batchImportApis', (_, { dbPath, apis }) => {
    try {
        const result = batchImportApis(dbPath, apis)
        return { success: true, ...result }
    } catch (e) {
        console.error('Batch import failed', e)
        return { success: false, message: (e as any).message }
    }
  })

  // Old import handler (kept for reference or backward compatibility if needed, though UI will switch to new flow)
  ipcMain.handle('importSwagger', async (_, { dbPath, projectId }) => {
    // ... existing implementation if needed ...
    // For now, let's redirect to new logic or just keep it as a legacy shortcut?
    // User wants the modal flow, so we will use the new handlers above.
    return { success: false, message: 'Use pickAndParseSwagger instead' }
  })
}
