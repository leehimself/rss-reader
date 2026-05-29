# AI-Rss 订阅源抓取器

桌面 RSS 聚合阅读器，集成 AI 智能摘要与对话问答，基于 Electron + React + Express + SQLite 构建。

## 功能特性

### AI 智能功能
- **AI 智能摘要** — 基于 LLM 的文章摘要生成，流式输出，结果缓存到 SQLite
- **文章问答** — 基于文章上下文的对话式问答，支持多轮对话
- **自定义模型** — 支持任意 OpenAI 兼容 API（DeepSeek、OpenAI、Claude 等）

### RSS 核心
- **订阅管理** — 支持 RSS 2.0 / Atom / JSON Feed，支持 RSSHub 镜像预设，自动发现网页 Feed 链接
- **文章阅读** — 左侧分类/Feed 树 + 文章列表 + 右侧文章详情的三栏布局；通过 @mozilla/readability 提取全文
- **全文搜索** — SQLite FTS5 全文检索引擎，搜索标题/摘要/正文
- **分类整理** — 自定义分类（支持重命名/删除），按 Feed 或分类查看未读文章
- **阅读状态** — 未读/已读标记，文章收藏（星标），批量标记已读
- **自动刷新** — 可配置刷新间隔的后台定时刷新，错误 Feed 指数退避重试
- **内容清理** — 自动清理过期已读文章（可配置保留天数和每 Feed 最大条数）

### 内容增强
- **图片代理** — HMAC 认证的本地图片缓存代理，延迟加载
- **视频嵌入** — YouTube / Bilibili / Vimeo 自动转换为嵌入式播放器
- **CCTV 央视视频** — 通过 hls.js 播放央视视频
- **内容适配** — 针对央视网、澎湃新闻等站点的定制内容提取

### 系统集成
- **OPML 导入导出** — 标准 OPML 2.0 格式，异步导入带进度跟踪
- **数据库备份** — 创建/恢复数据库备份
- **桌面集成** — 系统托盘、单实例锁、开机自启、deep link（feed://）
- **桌面通知** — 新文章桌面通知（可配置）
- **主题切换** — 浅色/深色/跟随系统主题
- **键盘快捷键** — `j/k` 导航，`m` 切换已读，`s` 切换星标，`r` 刷新
- **离线检测** — 网络状态提示横幅
- **代理支持** — 支持 HTTPS_PROXY / HTTP_PROXY 环境变量

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18, TypeScript, React Router 7, Zustand, Tailwind CSS 3, Vite 6 |
| 桌面 | Electron 34, electron-builder 26 |
| 后端 | Express 5, TypeScript（内嵌于 Electron 主进程） |
| AI | DeepSeek API / OpenAI 兼容 API，SSE 流式响应 |
| 数据库 | SQLite via better-sqlite3，WAL 模式，FTS5 |
| 工作线程 | worker_threads（RSS 抓取、文章富化、图片下载） |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（启动 Vite + Electron）
npm run dev

# 运行测试
npm test
```

## 构建

```bash
npm run build
```

构建产物位于 `release/` 目录。

## AI 功能配置

1. 打开设置，填入 API Key（从 [platform.deepseek.com](https://platform.deepseek.com) 获取）
2. 填入模型名称（如 `deepseek-v4-flash`、`deepseek-v4-pro` 等）
3. 打开任意文章 → 底部「AI 摘要」面板点击生成
4. 底部「文章问答」面板输入问题，AI 基于文章内容回答

## 项目结构

```
ai-rss-reader/
├── electron/          # Electron 主进程
├── preload/           # Electron preload 脚本
├── server/            # Express 后端（路由、RSS 抓取、数据库迁移、工作线程）
│   ├── routes/        # API 路由（feeds, articles, categories, ai, opml, 等）
│   ├── services/      # 服务层（AI API 客户端）
│   ├── rss/           # RSS 核心逻辑（抓取、富化、调度、清理）
│   └── workers/       # 工作线程（RSS、富化、图片）
├── src/               # React 前端
│   ├── pages/         # 页面组件
│   ├── components/    # UI 组件
│   ├── hooks/         # React Hooks
│   ├── store/         # Zustand 状态管理
│   └── lib/           # 工具库
├── shared/            # 前后端共享类型和工具
├── public/            # 静态资源
├── assets/            # 图标资源
└── build/             # 构建资源
```

## 配置

| 环境变量 | 说明 | 默认值 |
|---|---|---|
| `VITE_DEV_SERVER_PORT` | 开发服务器端口 | 5173 |
| `HTTPS_PROXY` / `HTTP_PROXY` | HTTP 代理地址 | - |

应用内设置（存储于 `settings` 表）：

| 设置项 | 说明 | 默认值 |
|---|---|---|
| `refresh_interval` | 刷新间隔（分钟） | 30 |
| `theme` | 主题 | system |
| `max_keep_days` | 文章保留天数 | 90 |
| `max_articles_per_feed` | 每 Feed 最大文章数 | 500 |
| `enable_notifications` | 启用通知 | true |
| `open_at_login` | 开机自启 | false |
| `minimize_to_tray` | 最小化到托盘 | true |
| `log_level` | 日志级别 | info |
| `ai_api_key` | API Key | - |
| `ai_model` | AI 模型名称 | deepseek-v4-flash |
| `ai_summary_language` | 摘要语言 | zh |

## 键鼠操作

| 快捷键 | 功能 |
|---|---|
| `j` / `↓` | 下一条文章 |
| `k` / `↑` | 上一条文章 |
| `m` | 切换已读/未读 |
| `s` | 切换星标 |
| `r` | 刷新当前 Feed |
| 右键 | 上下文菜单（复制、打开链接、全选） |

## 许可证

MIT
