import Database, { type Database as BetterSqlite3Database } from 'better-sqlite3';

// 定义数据库连接键的类型
type DbConnectionKey = {
    dbPath: string;
    projectSign: string;
};

// 存储多个数据库连接的映射
const dbConnections: Map<DbConnectionKey, BetterSqlite3Database> = new Map();

// 动态初始化数据库连接的函数
function initDatabase(dbPath: string, projectSign: string): BetterSqlite3Database {
    const key: DbConnectionKey = { dbPath, projectSign };
    if (dbConnections.has(key)) {
        return dbConnections.get(key)!;
    }

    // 初始化数据库连接
    const db = new Database(dbPath, { verbose: console.log });
    dbConnections.set(key, db);

    return db;
}

// 新增函数：在指定数据库中创建表
function createProjectTable(key: DbConnectionKey): void {
    const db = initDatabase(key.dbPath, key.projectSign);

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

// 导出初始化数据库连接的函数和创建表的函数
export { initDatabase, dbConnections, createProjectTable };