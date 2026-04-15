import Database, { type Database as BetterSqlite3Database } from 'better-sqlite3';
import { join } from 'node:path'
import { existsSync, mkdirSync, statSync } from 'node:fs'

// 存储多个数据库连接的映射
const dbConnections: Map<string, BetterSqlite3Database> = new Map();

// 动态初始化数据库连接的函数
function initDatabase(dbPath: string): BetterSqlite3Database {
    const normalizedPath = join(dbPath);
    if (dbConnections.has(normalizedPath)) {
        return dbConnections.get(normalizedPath)!;
    }

    // 初始化数据库连接
    try {
        if (existsSync(normalizedPath) && statSync(normalizedPath).isDirectory()) {
            throw new Error(`Unable to open database. The path is a directory: ${normalizedPath}`);
        }
        const db = new Database(normalizedPath, { verbose: console.log });
        dbConnections.set(normalizedPath, db);
        console.log('dbConnections', dbConnections)
        return db;
    } catch (error) {
        console.error(`Failed to initialize database at ${normalizedPath}`, error);
        throw new Error(`无法打开数据库文件: ${normalizedPath}. 请检查路径是否包含非法字符或权限不足。详细错误: ${(error as any).message}`);
    }
}

function ensureApisMethodColumn(dbPath: string): void {
  const db = initDatabase(dbPath)
  const columns = db.prepare(`PRAGMA table_info('apis')`).all() as Array<{ name: string }>
  const hasMethod = columns.some((c) => c.name === 'method')
  if (hasMethod) return
  db.exec(`ALTER TABLE apis ADD COLUMN method VARCHAR(10)`)
  try {
    const hasType = columns.some((c) => c.name === 'type')
    if (hasType) {
      db.exec(`UPDATE apis SET method = UPPER(type) WHERE (method IS NULL OR method = '') AND type IS NOT NULL AND type != ''`)
    }
  } catch {
  } finally {
    db.exec(`UPDATE apis SET method = 'GET' WHERE method IS NULL OR method = ''`)
  }
}

export function ensureDatabaseInitialized(dbPath: string): BetterSqlite3Database {
  const db = initDatabase(dbPath)
  createProjectTable(dbPath)
  createApiTable(dbPath)
  createFoldersTable(dbPath)
  ensureApisMethodColumn(dbPath)
  return db
}

// 选择文件夹 并创建数据库文件
export function createAndInitDatabaseIfNotDbFile(folderPath: string): string {
  const dbFileName = `mock${Date.now()}.db`
  const dbFilePath = join(folderPath, dbFileName)

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }

  ensureDatabaseInitialized(dbFilePath)

  console.log(`Database created and initialized at: ${dbFilePath}`)
  return dbFilePath
}

// 新增函数：在指定数据库中创建表
function createProjectTable(dbPath: string): void {
    const db = initDatabase(dbPath);

    // 检查表是否存在
    const tableExistsQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name='project';`;
    const tableExists = db.prepare(tableExistsQuery).get();

    if (!tableExists) {
        const createTableQuery = `
            CREATE TABLE project (
                id INTEGER PRIMARY KEY,
                createUserId INTEGER NOT NULL,
                updateUserId INTEGER NOT NULL,
                sign VARCHAR(50) NOT NULL,
                create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                base_url VARCHAR(50),
                name VARCHAR(50),
                description VARCHAR(200),
                apiExportTemplate VARCHAR(2000),
                proxyInfo VARCHAR(2000)
            )
        `;
        db.exec(createTableQuery);

        // 创建触发器以在更新记录时自动更新 update_time
        const updateTriggerQuery = `
            CREATE TRIGGER IF NOT EXISTS update_project_timestamp
            AFTER UPDATE ON project
            FOR EACH ROW
            BEGIN
                UPDATE project SET update_time = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;
        `;
        db.exec(updateTriggerQuery);
    }
}

// 创建目录表
function createFoldersTable(dbPath: string): void {
    const db = initDatabase(dbPath);

    // 检查表是否存在
    const tableExistsQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name='folders';`;
    const tableExists = db.prepare(tableExistsQuery).get();

    if (!tableExists) {
        const createTableQuery = `
            CREATE TABLE folders (
                id INTEGER PRIMARY KEY,
                name VARCHAR(200) NOT NULL
            )
        `;
        db.exec(createTableQuery);
    }
}

//  创建 api 表
function createApiTable(dbPath: string): void {
    const db = initDatabase(dbPath);

    // 检查表是否存在
    const tableExistsQuery = `SELECT name FROM sqlite_master WHERE type='table' AND name='apis';`;
    const tableExists = db.prepare(tableExistsQuery).get();

    if (!tableExists) {
        const createTableQuery = `
            CREATE TABLE apis (
                id INTEGER PRIMARY KEY,
                projectId INTEGER NOT NULL,
                catalogId INTEGER,
                name VARCHAR(50) NOT NULL,
                url VARCHAR(200) NOT NULL,
                method VARCHAR(10),
                content TEXT,
                type VARCHAR(50),
                responseDelay INTEGER,
                description VARCHAR(200),
                isOpen BOOLEAN NOT NULL DEFAULT 1,
                isDeleted BOOLEAN NOT NULL DEFAULT 0,
                create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                paramCheckStatus VARCHAR(50),
                paramJson TEXT
            )
        `;
        db.exec(createTableQuery);

        // 创建触发器以在更新记录时自动更新 update_time
        const updateTriggerQuery = `
            CREATE TRIGGER IF NOT EXISTS update_api_timestamp
            AFTER UPDATE ON apis
            FOR EACH ROW
            BEGIN
                UPDATE apis SET update_time = CURRENT_TIMESTAMP WHERE id = OLD.id;
            END;
        `;
        db.exec(updateTriggerQuery);
    }
}

// 随机字符串生成器
function generateRandomString(length: number) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length),
    );
  }
  return result;
}

// 导出初始化数据库连接的函数和创建表的函数
export { initDatabase, dbConnections, createProjectTable };

// Project CRUD
export function getProjectList(dbPath: string) {
    const db = ensureDatabaseInitialized(dbPath);
    return db.prepare('SELECT * FROM project').all();
}

export function createProject(dbPath: string, project: any) {
    const db = ensureDatabaseInitialized(dbPath);
    const stmt = db.prepare(`
        INSERT INTO project (sign, name, base_url, description, createUserId, updateUserId)
        VALUES (@sign, @name, @base_url, @description, @createUserId, @updateUserId)
    `);
    const info = stmt.run({
        sign: project.projectSign || generateRandomString(10),
        name: project.projectName,
        base_url: project.baseUrl,
        description: project.description || '',
        createUserId: 0, // Default system user
        updateUserId: 0
    });
    return { id: info.lastInsertRowid, ...project };
}

export function updateProject(dbPath: string, project: any) {
    const db = ensureDatabaseInitialized(dbPath);
    const stmt = db.prepare(`
        UPDATE project 
        SET name = @name, base_url = @base_url, description = @description
        WHERE id = @id
    `);
    stmt.run({
        id: project.id,
        name: project.projectName,
        base_url: project.baseUrl,
        description: project.description
    });
    return project;
}

export function deleteProject(dbPath: string, id: number) {
    const db = ensureDatabaseInitialized(dbPath);
    db.prepare('DELETE FROM project WHERE id = ?').run(id);
    return id;
}

// Api CRUD
export function getApiList(dbPath: string, projectId: number) {
    const db = ensureDatabaseInitialized(dbPath);
    return db.prepare('SELECT * FROM apis WHERE projectId = ? AND isDeleted = 0').all(projectId);
}

export function createApi(dbPath: string, api: any) {
    const db = ensureDatabaseInitialized(dbPath);
    const stmt = db.prepare(`
        INSERT INTO apis (projectId, name, url, method, content, responseDelay, isOpen, paramCheckStatus, paramJson)
        VALUES (@projectId, @name, @url, @method, @content, @responseDelay, @isOpen, @paramCheckStatus, @paramJson)
    `);
    const info = stmt.run({
        projectId: api.projectId,
        name: api.name,
        url: api.url,
        method: api.method || 'GET',
        content: api.content || '{}',
        responseDelay: api.responseDelay || 0,
        isOpen: api.isOpen ? 1 : 0,
        paramCheckStatus: api.paramCheckStatus || 'close',
        paramJson: api.paramJson || '[]'
    });
    return { id: info.lastInsertRowid, ...api };
}

export function updateApi(dbPath: string, api: any) {
    const db = ensureDatabaseInitialized(dbPath);
    const stmt = db.prepare(`
        UPDATE apis 
        SET name = @name, url = @url, method = @method, content = @content, 
            responseDelay = @responseDelay, isOpen = @isOpen, 
            paramCheckStatus = @paramCheckStatus, paramJson = @paramJson
        WHERE id = @id
    `);
    stmt.run({
        id: api.id,
        name: api.name,
        url: api.url,
        method: api.method,
        content: api.content,
        responseDelay: api.responseDelay,
        isOpen: api.isOpen ? 1 : 0,
        paramCheckStatus: api.paramCheckStatus,
        paramJson: api.paramJson
    });
    return api;
}

export function deleteApi(dbPath: string, id: number) {
    const db = ensureDatabaseInitialized(dbPath);
    // Soft delete
    db.prepare('UPDATE apis SET isDeleted = 1 WHERE id = ?').run(id);
    return id;
}

export function ensureFolders(dbPath: string, tags: string[]) {
    const db = ensureDatabaseInitialized(dbPath)
    const existing = db.prepare('SELECT id, name FROM folders').all() as any[]
    const map = new Map<string, number>(existing.map(f => [f.name, f.id]))
    
    const insert = db.prepare('INSERT INTO folders (name) VALUES (?)')
    
    db.transaction(() => {
        for (const tag of tags) {
            if (!tag) continue
            if (!map.has(tag)) {
                const info = insert.run(tag)
                map.set(tag, Number(info.lastInsertRowid))
            }
        }
    })()
    
    return map
}

export function checkApisExistence(dbPath: string, projectId: number, apis: any[]) {
    const db = ensureDatabaseInitialized(dbPath);
    const stmt = db.prepare('SELECT id FROM apis WHERE projectId = ? AND url = ? AND method = ?');
    
    return apis.map(api => {
        const row = stmt.get(projectId, api.url, api.method) as any;
        return {
            ...api,
            isDuplicate: !!row,
            existingId: row ? row.id : undefined
        };
    });
}

export function batchImportApis(dbPath: string, apis: any[]) {
    const db = ensureDatabaseInitialized(dbPath);
    
    // Update statement
    const update = db.prepare(`
        UPDATE apis 
        SET catalogId = @catalogId, name = @name, content = @content, 
            responseDelay = @responseDelay, isOpen = @isOpen, description = @description,
            paramCheckStatus = @paramCheckStatus, paramJson = @paramJson
        WHERE id = @existingId
    `);

    // Insert statement
    const insert = db.prepare(`
        INSERT INTO apis (projectId, catalogId, name, url, method, content, responseDelay, isOpen, description, paramCheckStatus, paramJson)
        VALUES (@projectId, @catalogId, @name, @url, @method, @content, @responseDelay, @isOpen, @description, @paramCheckStatus, @paramJson)
    `);

    const transaction = db.transaction((list) => {
        let inserted = 0;
        let updated = 0;
        for (const api of list) {
            if (api.existingId) {
                update.run({
                    existingId: api.existingId,
                    catalogId: api.catalogId || null,
                    name: api.name,
                    content: api.content || '{}',
                    responseDelay: api.responseDelay || 0,
                    isOpen: api.isOpen ? 1 : 0,
                    description: api.description || '',
                    paramCheckStatus: api.paramCheckStatus || 'close',
                    paramJson: api.paramJson || '[]'
                });
                updated++;
            } else {
                insert.run({
                    projectId: api.projectId,
                    catalogId: api.catalogId || null,
                    name: api.name,
                    url: api.url,
                    method: api.method || 'GET',
                    content: api.content || '{}',
                    responseDelay: api.responseDelay || 0,
                    isOpen: api.isOpen ? 1 : 0,
                    description: api.description || '',
                    paramCheckStatus: api.paramCheckStatus || 'close',
                    paramJson: api.paramJson || '[]'
                });
                inserted++;
            }
        }
        return { inserted, updated };
    });

    return transaction(apis);
}

export function createApis(dbPath: string, apis: any[]) {
    const db = ensureDatabaseInitialized(dbPath);
    const insert = db.prepare(`
        INSERT INTO apis (projectId, catalogId, name, url, method, content, responseDelay, isOpen, paramCheckStatus, paramJson)
        VALUES (@projectId, @catalogId, @name, @url, @method, @content, @responseDelay, @isOpen, @paramCheckStatus, @paramJson)
    `);

    const insertMany = db.transaction((apis) => {
        for (const api of apis) {
            insert.run({
                projectId: api.projectId,
                catalogId: api.catalogId || null,
                name: api.name,
                url: api.url,
                method: api.method || 'GET',
                content: api.content || '{}',
                responseDelay: api.responseDelay || 0,
                isOpen: api.isOpen ? 1 : 0,
                paramCheckStatus: api.paramCheckStatus || 'close',
                paramJson: api.paramJson || '[]'
            });
        }
    });

    insertMany(apis);
}

export function getFolders(dbPath: string) {
    const db = ensureDatabaseInitialized(dbPath)
    return db.prepare('SELECT * FROM folders').all()
}

export function createFolder(dbPath: string, name: string) {
    const db = ensureDatabaseInitialized(dbPath)
    const stmt = db.prepare('INSERT INTO folders (name) VALUES (?)')
    const info = stmt.run(name)
    return { id: info.lastInsertRowid, name }
}

export function updateFolder(dbPath: string, id: number, name: string) {
    const db = ensureDatabaseInitialized(dbPath)
    db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, id)
    return { id, name }
}

export function deleteFolder(dbPath: string, id: number) {
    const db = ensureDatabaseInitialized(dbPath)
    db.prepare('DELETE FROM folders WHERE id = ?').run(id)
    return id
}

// Get all projects from all connected DBs
export function getAllProjects() {
    const projects: any[] = [];
    for (const [path, db] of dbConnections.entries()) {
        try {
            const pros = db.prepare('SELECT * FROM project').all();
            pros.forEach((p: any) => {
                projects.push({ ...p, dbPath: path });
            });
        } catch (e) {
            console.error(`Error reading projects from ${path}`, e);
        }
    }
    return projects;
}

// Match Api for Mock Engine
export function matchApi(dbPath: string, url: string, method: string) {
     const db = ensureDatabaseInitialized(dbPath);
    
    // Simple matching for now. TODO: improved matching with params
    // url is relative to project base_url.
    // We need to match exact url or pattern.
    // For now, assume exact match on `url` column.
    const stmt = db.prepare(`
        SELECT * FROM apis 
        WHERE url = ? AND method = ? AND isOpen = 1 AND isDeleted = 0
    `);
    return stmt.get(url, method);
}
