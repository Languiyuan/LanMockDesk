# LanmockDesk 交互设计方案 (UX Design Document)

## 1. 设计理念 (Design Philosophy)

*   **开发者优先 (Developer First)**: 界面布局参考主流 IDE (VS Code) 和 API 调试工具 (Postman/Apifox)，减少学习成本。支持全键盘操作和快捷键。
*   **所见即所得 (WYSIWYG)**: Mock 规则的修改应立即反映在预览中，配置的变更应实时生效，无需手动重启服务。
*   **无感介入 (Seamless Integration)**: Mock 服务静默运行，仅在需要时通过状态指示器或日志面板提供反馈，不打扰核心开发流。
*   **本地化与高效 (Native & Efficient)**: 充分利用桌面端特性，支持文件拖拽导入、本地多数据库秒级切换。

---

## 2. 全局交互框架 (Global Interaction)

### 2.1 布局结构
采用 **左侧导航 + 中间列表 + 右侧详情** 的三栏式布局（可折叠）。
*   **Level 1 (最左侧窄栏)**: 应用级导航（项目列表、设置、关于）。
*   **Level 2 (侧边栏)**: 当前项目的接口目录树/列表。支持搜索、过滤、拖拽排序。
*   **Level 3 (主内容区)**: 接口详情编辑、项目配置、欢迎页。
*   **Status Bar (底部状态栏)**: 显示 Mock 服务端口、当前环境 (DB)、全局代理状态。

### 2.2 交互细节
*   **Toast 反馈**: 操作成功/失败使用顶部轻量级 Toast 提示。
*   **Dialog 模态框**: 仅用于关键决策（如删除确认、复杂配置）。
*   **Drawer 抽屉**: 用于查看请求日志、导入 Swagger 等辅助任务，避免打断当前编辑心流。

---

## 3. 核心模块交互设计

### 3.1 项目管理 (Project Hub)
**场景**: 用户打开应用，选择或创建项目。

*   **启动页 (Welcome Page)**:
    *   **最近项目 (Recent)**: 卡片式展示最近打开的 3-5 个项目，显示名称、BaseURL、最后修改时间。
    *   **快速操作**:
        *   `[+] 新建项目`: 弹窗输入名称、BaseURL。
        *   `[📂] 打开文件夹`: 选择包含 `mock.db` 的文件夹，自动识别并加载。
        *   `[⚡] 快速导入`: 拖拽 Swagger 文件到启动页，自动创建项目并导入接口。
*   **数据库切换**:
    *   在左下角显示当前连接的 DB 文件名（如 `dev_v1.db`）。
    *   点击弹出文件选择器，切换 DB 后界面自动刷新，无需重启应用。

### 3.2 接口工作台 (API Workbench)
**场景**: 日常最高频使用的界面，编辑 Mock 规则。

*   **侧边栏 (Sidebar)**:
    *   **状态指示灯**: 接口名称左侧显示小圆点。
        *   🟢 绿色: Mock 开启。
        *   ⚪ 灰色: Mock 关闭 (透传或 404)。
        *   🟠 橙色: 开启了延时模拟。
    *   **快速过滤**: 顶部搜索框支持模糊搜索 (URL/Name)。
    *   **右键菜单**: 复制接口、删除、克隆、复制 Mock URL。

*   **详情页 (Editor)**:
    *   **头部 (Header)**:
        *   `Method` (彩色标签) + `URL` (输入框) + `Mock 开关` (Toggle)。
        *   `Save` 按钮 (高亮提示未保存，支持 `Ctrl+S`)。
    *   **工具栏**:
        *   `Response Delay`: 滑动条或输入框设置毫秒数 (0ms - 5000ms)。
        *   `Proxy Override`: 针对该接口的独立代理设置（可选）。
    *   **内容区 (Split View)**:
        *   **左侧 (Rule Editor)**: Ace Editor / Monaco Editor。
            *   支持 Mock.js 语法高亮。
            *   **智能辅助**: 输入 `@` 自动提示 Mock.js 占位符 (如 `@email`, `@image`)。
        *   **右侧 (Live Preview)**: 实时生成的 JSON 预览。
            *   每次修改规则后自动刷新（或提供“运行”按钮）。
            *   支持一键复制预览结果。

### 3.3 Swagger 导入 (Swagger Import)
**场景**: 后端接口更新，前端同步 Mock 数据。

*   **入口**: 项目设置或侧边栏顶部 `+` 号下拉菜单 -> `Import Swagger`。
*   **交互流程**:
    1.  **上传**:
        *   **Tab 1 - File**: 拖拽 `.json` / `.yaml` 文件进入虚线框区域。
        *   **Tab 2 - URL**: 输入 Swagger Doc URL，点击 `Parse`。
    2.  **解析与预览 (Diff)**:
        *   解析成功后，展示即将导入的接口列表。
        *   **冲突检测**: 标记 `New` (新增) 和 `Conflict` (已存在)。
        *   **策略选择**: 提供单选框 —— "覆盖现有接口" / "仅添加新接口" / "智能合并"。
    3.  **完成**: 导入完成后，自动跳转到新导入的第一个接口，并弹出 Toast "成功导入 X 个接口"。

### 3.4 代理配置 (Proxy Settings)
**场景**: 部分接口已开发完成，需要联调真实后端，其余接口继续 Mock。

*   **入口**: 底部状态栏 `Proxy: Off` 点击，或顶部工具栏 `Proxy` 图标。
*   **交互形式**: 模态框 (Modal)。
*   **配置项**:
    *   **Global Switch**: 全局代理总开关。
    *   **Target URL**: 目标服务器地址 (如 `http://192.168.1.100:8080`)。
    *   **Mode Selection (模式选择)**:
        *   `Fallback Mode` (默认): 本地 Mock 没匹配到时，转发到 Target。
        *   `Force Mode`: 强制所有请求转发到 Target (Mock 失效)。
        *   `Match Mode`: 仅转发符合特定前缀 (如 `/api/v2`) 的请求。
*   **Headers**: 支持添加自定义 Header (如 `Authorization: Bearer ...`) 用于绕过鉴权。

### 3.5 实时日志 (Traffic Inspector)
**场景**: 请求没返回预期数据，排查是 Mock 规则写错了还是没匹配上。

*   **入口**: 底部状态栏 `Logs` 按钮，点击向上展开面板 (类似 DevTools Console)。
*   **列表内容**:
    *   时间戳 | Method | URL | Status | Source (Mock/Proxy/Error) | Duration
*   **交互**:
    *   点击某一行，右侧展示 Request Header/Body 和 Response Data。
    *   **高亮错误**: 404 或 500 请求用红色背景标记。
    *   **Source 标记**:
        *   `MOCK`: 命中本地规则。
        *   `PROXY`: 转发到了真实服务器。
        *   `SYS`: 系统错误 (如 Mock 语法错误)。

---

## 4. 视觉风格建议 (Visual Style)

*   **主题**: 跟随系统自动切换 Light/Dark 模式。
    *   Dark Mode: 深灰背景 (`#1e1e1e`), 亮色文字，强调色使用青色或紫色。
*   **色彩**:
    *   GET: 蓝色 (`#61affe`)
    *   POST: 绿色 (`#49cc90`)
    *   PUT: 橙色 (`#fca130`)
    *   DELETE: 红色 (`#f93e3e`)
*   **字体**: 代码编辑器使用等宽字体 (JetBrains Mono / Fira Code)。

---

## 5. 待办交互开发任务 (Action Items)

基于上述设计，建议优先落地的交互功能：

1.  **项目列表页**: 实现“最近项目”和“拖拽打开文件夹”的交互。
2.  **接口编辑页**: 实现“左侧编辑 Mock 规则，右侧实时预览”的分栏布局。
3.  **导入功能**: 实现 Swagger 文件的拖拽上传解析 UI。
4.  **状态栏**: 添加底部状态栏，显示服务状态和简单的代理开关。
