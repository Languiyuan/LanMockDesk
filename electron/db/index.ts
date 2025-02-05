import Database, { type Database as BetterSqlite3Database } from 'better-sqlite3';
import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'

// 存储多个数据库连接的映射
const dbConnections: Map<string, BetterSqlite3Database> = new Map();

// 动态初始化数据库连接的函数
function initDatabase(dbPath: string): BetterSqlite3Database {
    if (dbConnections.has(dbPath)) {
        return dbConnections.get(dbPath)!;
    }

    // 初始化数据库连接
    const db = new Database(dbPath, { verbose: console.log });
    dbConnections.set(dbPath, db);
    console.log('dbConnections',dbConnections)
    return db;
}

// 选择文件夹 并创建数据库文件
export function createAndInitDatabaseIfNotDbFile(folderPath: string): string {
  const dbFileName = `mock${Date.now()}.db`
  const dbFilePath = join(folderPath, dbFileName)

  if (!existsSync(folderPath)) {
    mkdirSync(folderPath, { recursive: true })
  }

  initDatabase(dbFilePath)
  createProjectTable(dbFilePath)
  createApiTable(dbFilePath)
  createFoldersTable(dbFilePath)

  console.log(`Database created and initialized at: ${dbFilePath}`)
  return dbFilePath
}

// 新增函数：在指定数据库中创建表
function createProjectTable(dbPath: string): void {
    const db = dbConnections.get(dbPath);

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
    const db = dbConnections.get(dbPath);

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
    const db = dbConnections.get(dbPath);

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