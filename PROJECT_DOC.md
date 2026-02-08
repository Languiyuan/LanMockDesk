# LanmockDesk 项目文档

## 1. 项目概述

**LanmockDesk** 是 LanMock 的桌面客户端版本，旨在提供一个轻量级、无需部署服务器的 Mock 解决方案。它集成了 Mock 服务与管理界面，通过本地化存储和运行，降低了使用门槛，适合个人开发者或小型团队快速搭建 Mock 服务。

**项目状态**: 🚧 **正在开发中 (Under Development)**

---

## 2. 技术栈

### 2.1 核心架构 (Core)
- **Runtime**: Electron 29
- **Build Tool**: Vite 5 (配合 `vite-plugin-electron`)
- **Language**: TypeScript

### 2.2 前端 (Renderer Process)
- **Framework**: Vue 3.4
- **State Management**: Pinia (配合 `pinia-plugin-persistedstate` 实现持久化)
- **Router**: Vue Router 4
- **UI Library**: Naive UI
- **Styling**: Tailwind CSS, Sass
- **Code Editor**: Ace Editor (`vue3-ace-editor`)

### 2.3 后端/主进程 (Main Process)
- **Embedded Server**: Fastify (运行在 Electron 主进程中，提供本地 Mock 服务)
- **Database**: SQLite (`better-sqlite3`) - 本地文件存储
- **Package Manager**: NPM (注意：Better-sqlite3 对 pnpm 支持需特殊配置，推荐 npm)
- **Packaging**: Electron Builder

---

## 3. 架构设计

LanmockDesk 采用 Electron 典型的 **Main-Renderer** 架构，但为了实现本地 Mock 功能，在主进程中集成了 Web Server 和 SQLite 数据库。

### 3.1 核心模块
1.  **渲染进程 (Renderer)**:
    -   负责 UI 展示与用户交互。
    -   通过 IPC (Inter-Process Communication) 与主进程通信。
    -   不直接操作数据库，所有数据请求通过 IPC 发送给主进程。

2.  **主进程 (Main)**:
    -   **窗口管理**: 创建和管理应用窗口。
    -   **数据库管理**: 负责 SQLite 数据库文件的创建、连接与查询。支持多数据库文件切换。
    -   **Fastify 服务**: 内置启动一个 HTTP 服务器 (默认端口 4399)，用于响应外部的 Mock 请求。
    -   **IPC Handlers**: 处理来自渲染进程的业务请求（如获取项目列表、保存接口等）。

3.  **数据存储 (SQLite)**:
    -   数据以 `.db` 文件形式存储在用户本地。
    -   支持动态创建和链接不同的数据库文件，实现项目隔离或配置迁移。

### 3.2 运行流程
-   **启动**: Electron 启动 -> 初始化主窗口 -> 启动 Fastify 本地服务器 (localhost:4399) -> 初始化/连接 SQLite 数据库。
-   **交互**: 用户在界面操作 -> Renderer 发送 IPC 消息 -> Main 接收并操作 SQLite -> 返回结果。
-   **Mock**: 客户端请求 `http://localhost:4399/...` -> Fastify 接收请求 -> 查询 SQLite 匹配 Mock 规则 -> 返回 Mock 数据。

---

## 4. 功能说明

### 4.1 数据库/项目管理
-   **本地数据库**: 支持选择本地文件夹创建新的 SQLite 数据库文件 (`mock{timestamp}.db`)。
-   **多库切换**: 可以在不同的数据库文件间切换，方便管理不同环境或团队的数据。

### 4.2 接口管理 (API)
-   **接口定义**: 支持 HTTP 接口的创建、编辑、删除。
-   **Mock 规则**: 设置接口的 URL、Method、响应内容 (支持 JSON 模板)。
-   **响应延时**: 模拟网络延时。
-   **Swagger 导入**: 支持导入 Swagger/OpenAPI 文档，自动生成接口定义。

### 4.3 Mock 服务
-   **本地服务**: 启动应用即启动本地 Mock 服务器。
-   **请求拦截**: 根据请求路径和方法，自动匹配数据库中的接口定义并返回模拟数据。
-   **代理转发**: 支持配置代理规则，将特定请求转发到真实服务器。

### 4.4 交互要点（以当前实现为准）

本节用于说明 **“什么操作必须先做什么”** 以及这些限制在代码中的实现方式，便于使用与后续迭代。

#### 4.4.1 关键概念：什么叫“已选中并成功链接项目”

在渲染进程（前端 UI）中，右侧“接口管理”区域依赖一个 `currentProject`（由项目列表点击产生）。

当前版本中，可将“已选中并成功链接项目”理解为：

- 已在左侧项目列表中 **选中某个项目**（右侧区域拿到 `projectInfo`）。
- 且该 `projectInfo` 同时具备：
  - `dbPath`：指向本地 SQLite 数据库文件路径
  - `id`：该数据库内 `project` 表中对应记录的主键

只要缺少 `dbPath` 或 `id`，接口列表加载、新建/保存、搜索、Swagger 导入等行为会被短路（直接 `return`）。

#### 4.4.2 新建项目（创建 DB + 插入 project）

入口：左侧 `+` 按钮 → 选择“新建项目”。

交互与实现要点：

- “数据库地址”字段是只读输入框 + 文件夹选择按钮。
- 选择文件夹后，主进程会在该目录下自动创建一个新的数据库文件 `mock{timestamp}.db`，并初始化表结构（`project/apis/folders`）。
- UI 侧拿到创建结果后回填 `dbPath` 到表单；点击“确定”后：
  - 先在前端生成 `projectSign/createTime/updateTime/status` 等字段
  - 通过 IPC 调用 `createProject` 将项目写入该 `dbPath` 对应的数据库
  - DB 返回 `id` 后与前端对象合并，最终进入 `appConfigStore.projectList`（也就是左侧项目列表的数据来源）

技术落点（便于定位代码）：

- 表单与文件夹选择：`src/pages/project/components/CreateProjectModal.vue`
- 选择文件夹 hook：`src/hooks/useLinkDB.ts`（调用 `showFolderDialog`）
- 主进程弹窗与建库：`electron/main/handlers.ts` → `showFolderDialog`
- DB 初始化与建表：`electron/db/index.ts` → `createAndInitDatabaseIfNotDbFile`
- 插入 project：`electron/db/index.ts` → `createProject`
- 本地项目列表持久化：`src/stores/modules/appConfig.ts`（Pinia store）

#### 4.4.3 选择项目（驱动右侧接口面板）

入口：左侧项目卡片点击。

交互与实现要点：

- 点击 `ProjectCard` 后，父组件仅把当前对象写入 `currentProject`（组件内部状态），并通过 props 传给右侧 `ProjectDescriptions` 与 `ApiList`。
- 当前项目并未写入全局 store；因此“当前选中态”是页面级状态（刷新页面后需要重新选择）。

技术落点：

- 项目列表与选中事件：`src/pages/project/components/ProjectList.vue`
- 页面持有 `currentProject`：`src/pages/project/index.vue`
- 顶部项目信息展示（dbPath/baseUrl 点击复制）：`src/pages/project/components/ProjectDescriptions.vue`

#### 4.4.4 项目列表持久化与“连接状态点”

交互与实现要点：

- 左侧项目列表数据来自 `appConfigStore.projectList`，使用 Pinia 持久化插件写入 `localStorage`。
- 为了让主进程（Mock 服务）在应用启动后能拿到项目列表，渲染进程在 `appConfig` 变更时会发送 `updateConfigFile` 事件，把 `localStorage.appConfig` 的 JSON 原样写入 `userData/appConfig.json`。
- 应用启动时主进程会读取 `userData/appConfig.json`，并基于 `dbPath` 是否存在更新项目 `status`：
  - 存在：`status = 2`（UI 表现为蓝点）并尝试 `initDatabase(dbPath)`
  - 不存在：`status = 3`（UI 表现为红点）

说明：`status` 目前主要用于 UI 提示，接口管理区真正依赖的是 `dbPath` 与 `id` 是否齐全。

技术落点：

- 渲染进程持久化与通知主进程：`src/stores/piniaPersist.ts`
- 主进程启动时读取并初始化 DB 连接：`electron/main/senders.ts` → `initAppConfig`

#### 4.4.5 接口管理：必须先选中并链接项目

入口：右侧接口区域的“新建接口 / 搜索 / 导入 Swagger”。

交互规则（当前版本）：

- 未满足 `projectInfo.dbPath + projectInfo.id` 时：
  - 接口列表不会自动加载
  - “新建接口/保存”“搜索”“导入 Swagger”点击不会触发任何业务（直接短路返回）
- 满足条件后：
  - `ApiList` 会在 `watch(projectInfo)` 时自动拉取列表
  - “搜索”是 **客户端过滤**：先取全量列表，再按 `name/url` 做 `includes` 过滤
  - 新建/编辑保存成功后会刷新列表

技术落点：

- UI 与前置校验：`src/pages/project/components/ApiList.vue`
- IPC：`electron/main/handlers.ts`（`getApiList/createApi/updateApi/deleteApi`）
- DB：`electron/db/index.ts`（`getApiList/createApi/updateApi/deleteApi`）

#### 4.4.6 Swagger 导入：当前实现范围与反馈

入口：右侧接口区域“导入 Swagger”。

交互与实现要点：

- 目前仅支持从本地选择 `.json` 文件（系统文件选择器）。
- 取消选择：返回 `{ success:false, message:'Canceled' }`，前端不会提示错误。
- 解析规则（当前实现）：
  - 从 `swagger.paths` 枚举 URL 与 method
  - `name` 优先取 `summary`，否则 `operationId`，否则使用 url
  - `content` 优先尝试从 `responses[200/201]` 里提取 JSON example（Swagger2 的 `examples` 或 OpenAPI3 的 `content['application/json'].example`），拿不到则用 `{}`
- 导入落库：以事务批量插入 `apis` 表，成功后提示“成功导入 X 个接口”，并刷新列表。

技术落点：

- UI：`src/pages/project/components/ApiList.vue` → `handleImportSwagger`
- Main 解析与导入：`electron/main/handlers.ts` → `importSwagger/parseSwagger`
- DB 批量插入：`electron/db/index.ts` → `createApis`（transaction）

#### 4.4.7 Mock 请求匹配：baseUrl 与接口 url 的关系

Mock 服务运行在主进程内置 Fastify（默认 `127.0.0.1:4399`）。匹配流程：

- 先在所有“已连接的数据库”中读取 `project`，按 `base_url` 前缀匹配当前请求 URL。
- 匹配到项目后，将请求 URL 裁剪成相对路径 `relativeUrl`（从 `base_url` 后截取，并保证以 `/` 开头）。
- 再在该项目对应的数据库文件中用 `(relativeUrl, method)` 精确匹配 `apis` 表，且要求 `isOpen=1 & isDeleted=0`。
- 命中则对 `content` 做 JSON.parse，并用 `mockjs` 生成响应；未命中则尝试从 `proxyInfo` 解析目标地址进行转发。

注意：因为项目匹配基于 `base_url` 前缀，建议不同项目的 `baseUrl` 保持唯一且避免互为前缀（例如 `/api` 与 `/api/v2` 同时存在时可能产生歧义）。

技术落点：

- Fastify 路由与匹配逻辑：`electron/main/index.ts`
- 项目聚合：`electron/db/index.ts` → `getAllProjects`
- API 匹配：`electron/db/index.ts` → `matchApi`

#### 4.4.8 “链接项目（选择现有 .db）”能力状态

当前 UI 已提供“链接项目”的入口，但逻辑仍为 TODO：

- 代码中已预留选择 `.db` 文件并初始化连接的能力（`showDatabaseFileDialog` / `selectDatabaseFile`），但前端尚未把“链接”流程串起来（例如读取 `project` 表并加入左侧项目列表）。

因此，现阶段稳定可用的路径是“新建项目（选择文件夹创建新 DB）→ 在新 DB 中创建项目”。

---

## 5. 数据库设计 (SQLite)

### 5.1 Project 表
存储项目基本信息。
```sql
CREATE TABLE project (
    id INTEGER PRIMARY KEY,
    sign VARCHAR(50) NOT NULL,      -- 项目标识
    name VARCHAR(50),               -- 项目名称
    base_url VARCHAR(50),           -- 基础URL
    description VARCHAR(200),       -- 描述
    proxyInfo VARCHAR(2000),        -- 代理配置
    create_time DATETIME,
    update_time DATETIME
    ...
)
```

### 5.2 Apis 表
存储接口定义及 Mock 规则。
```sql
CREATE TABLE apis (
    id INTEGER PRIMARY KEY,
    projectId INTEGER NOT NULL,     -- 关联项目ID
    name VARCHAR(50) NOT NULL,      -- 接口名称
    url VARCHAR(200) NOT NULL,      -- 接口路径
    method VARCHAR(10),             -- 请求方法 (GET/POST...)
    content TEXT,                   -- Mock规则/响应内容
    responseDelay INTEGER,          -- 响应延迟(ms)
    isOpen BOOLEAN,                 -- 是否开启
    paramCheckStatus VARCHAR(50),   -- 参数校验状态
    paramJson TEXT,                 -- 参数定义
    ...
)
```

### 5.3 Folders 表
接口目录/文件夹管理。
```sql
CREATE TABLE folders (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL
)
```

---

## 6. 开发与构建

### 6.1 环境要求
-   Node.js >= 18
-   Python (用于编译 `better-sqlite3` 等原生模块)
-   Visual Studio C++ Build Tools (Windows 下编译原生模块需要)

### 6.2 常用命令
```bash
# 安装依赖 (推荐使用 npm，pnpm 可能遇到 better-sqlite3 路径问题)
npm install

# 启动开发环境
npm run dev

# 重新编译 sqlite (如果遇到模块版本不匹配)
npm run rebuild

# 打包应用
npm run build
```

### 6.3 注意事项
-   **Native Modules**: `better-sqlite3` 是原生模块，Electron 版本升级或 Node 版本变更时通常需要重新编译 (`electron-rebuild`)。
-   **Windows 权限**: 在 Windows 上打包或某些运行时操作可能需要管理员权限。

---

## 7. 待办事项 (Todo List)

### 7.1 项目管理 (Project Management)
- [x] **IPC Handlers**: 实现 `getProjectList`, `createProject`, `updateProject`, `deleteProject` 的 IPC 接口。
- [x] **DB Operations**: 在 `electron/db/index.ts` 中实现对应的 SQLite 增删改查方法。
- [x] **Frontend**: 完善 `ProjectList` 组件，调用 IPC 接口实现项目的增删改查。

### 7.2 接口管理 (API Management)
- [x] **IPC Handlers**: 实现 `getApiList`, `createApi`, `updateApi`, `deleteApi` 的 IPC 接口。
- [x] **DB Operations**: 在 `electron/db/index.ts` 中实现对应的 SQLite 增删改查方法。
- [x] **Frontend**: 完善 `ApiList` 组件，调用 IPC 接口实现接口的增删改查和列表展示。

### 7.3 Mock 引擎 (Mock Engine)
- [x] **Fastify Handler**: 在 `electron/main/index.ts` 中实现通用路由处理。
- [x] **Route Matching**: 实现根据请求 URL 和 Method 匹配 `apis` 表中定义的接口。
- [x] **Mock.js Integration**: 引入 `mockjs` 库，处理接口定义的 `content` (Mock 规则) 并生成最终 JSON 数据。
- [x] **Delay Simulation**: 实现接口定义的 `responseDelay` 延时逻辑。

### 7.4 导入导出 (Import/Export)
- [x] **Swagger Import**: 实现解析 Swagger/OpenAPI JSON 并批量插入 `apis` 表的功能。
- [x] **Frontend Upload**: 实现前端 Swagger 文件上传和导入触发逻辑。

### 7.5 其他 (Others)
- [x] **Proxy**: 实现代理转发功能，支持将未匹配 Mock 的请求或特定前缀请求转发到目标服务器。

