# RSS Reader

桌面端 RSS 聚合阅读器，基于 Electron + React + SQLite 构建。

## 功能

- **RSSHub 镜像源支持**：内置 3 个镜像源（injahow.cn / rssforever.com / pseudoyu.com）+ 自定义 URL
- **多站点内容适配**：澎湃新闻、CCTV 新闻联播、3DM 游戏、Misskon、asiantolick 等
- **CCTV 视频内嵌播放**：新闻联播视频通过 hls.js 在阅读器内直接播放
- **图片懒加载解包**：自动处理 `data-src`、`data:svg` 占位等 6 种懒加载格式
- **嵌套图片代理解析**：递归解包多层代理 URL，直连 CDN
- **三级图片回退**：直连 → 代理 → 占位，服务器不可达时自动降级
- **离线缓存**：打开文章后自动后台预缓存图片，支持一键全量预缓存
- **关键词搜索**：LIKE 模糊匹配标题/摘要/正文
- **收藏文章**
- **暗色模式**
- **关闭窗口隐藏托盘**：后台持续运行，定时刷新 RSS

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Electron 34 |
| 前端 | React 18 + TypeScript + Tailwind CSS |
| 路由 | React Router |
| 状态管理 | Zustand |
| 数据库 | SQLite (better-sqlite3) |
| RSS 解析 | rss-parser |
| 内容提取 | @mozilla/readability + JSDOM |
| 视频播放 | hls.js |
| 测试 | Vitest (23 项) |
| 打包 | electron-builder (NSIS 安装包) |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（Vite HMR + Electron）
npm run dev

# 或使用脚本
dev.bat          # 开发模式
start.bat        # 生产模式（需先 build）
build.bat        # 构建 + 打包安装程序
```

## 构建安装包

```bash
npm run build
npx electron-builder --win
```

输出：`release/RSS Reader Setup 1.0.0.exe`

## 项目结构

```
rss-reader/
├── electron/main.ts          # Electron 主进程
├── preload/index.ts          # 上下文桥接
├── server/                   # Express 服务端
│   ├── routes/               # API 路由
│   ├── rss/                  # RSS 抓取/富化/适配器
│   ├── workers/              # Worker 调度
│   └── migrations/           # 数据库迁移
├── src/                      # React 前端
│   ├── components/           # UI 组件
│   ├── pages/                # 页面
│   ├── store/                # Zustand 状态
│   └── lib/                  # API 客户端
└── shared/                   # 共享类型
```

## 下载

最新安装包：[Release 页面](https://gitee.com/himself233/rss-feed-crawler/releases)
