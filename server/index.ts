import express from 'express';
import http from 'http';
import path from 'path';
import { mkdirSync } from 'fs';
import { asarStatic } from './asar-static.js';
import { feedsRouter } from './routes/feeds.js';
import { articlesRouter } from './routes/articles.js';
import { categoriesRouter } from './routes/categories.js';
import { settingsRouter } from './routes/settings.js';
import { opmlRouter } from './routes/opml.js';
import { imageProxyRouter } from './routes/image-proxy.js';
import { cctvRouter } from './routes/cctv.js';
import { backupRouter } from './routes/backup.js';
import { healthRouter } from './routes/health.js';
import { log, setLogDir, setLogLevel } from './logger.js';
import { dbManager } from './db.js';
import { runMigrations } from './migrate.js';
import { settingsService } from './settings-service.js';
import { initProxyAgent } from './proxy.js';
import { startScheduler, stopScheduler } from './rss/scheduler.js';
import { startCleaner, stopCleaner } from './rss/cleaner.js';
import { CACHE_DIR, BACKUP_DIR, LOG_DIR, setAppPaths, DB_PATH } from './config.js';

let httpServer: http.Server | null = null;

export function getHttpServer(): http.Server | null {
  return httpServer;
}

export async function closeHttpServer(): Promise<void> {
  if (httpServer) {
    await new Promise<void>((resolve, reject) => {
      httpServer!.close((err) => {
        if (err) reject(err);
        else resolve();
      });
      httpServer = null;
    });
  }
}

export async function gracefulShutdown(): Promise<void> {
  stopScheduler();
  stopCleaner();
  await closeHttpServer();
  await dbManager.gracefulShutdown();
  log.info('server_shutdown_complete');
}

export async function createServer(preferredPort: number, options?: { appPath?: string; userDataPath?: string; isPackaged?: boolean }) {
  const serverApp = express();
  const isDev = !options?.isPackaged;

  const staticPath = isDev
    ? path.join(process.cwd(), 'dist')
    : path.join(options!.appPath!, 'dist');

  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(BACKUP_DIR, { recursive: true });
  mkdirSync(LOG_DIR, { recursive: true });

  setLogDir(LOG_DIR);

  const logLevel = await settingsService.get('log_level');
  if (logLevel) setLogLevel(String(logLevel));

  serverApp.use(express.json({ limit: '10mb' }));

  // CSP not needed for desktop Electron app

  serverApp.use('/api/feeds', feedsRouter);
  serverApp.use('/api/articles', articlesRouter);
  serverApp.use('/api/categories', categoriesRouter);
  serverApp.use('/api/settings', settingsRouter);
  serverApp.use('/api/opml', opmlRouter);
  serverApp.use('/api/image', imageProxyRouter);
  serverApp.use('/api/cctv', cctvRouter);
  serverApp.use('/api/backup', backupRouter);
  serverApp.use('/health', healthRouter);

  serverApp.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    log.error('Express error', { path: req.path, error: err.message });
    if (err.name === 'ValidationError' || err.name === 'BadRequestError') {
      res.status(400).json({ error: err.message, code: 'BAD_REQUEST' });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  });

  // Serve index.html for root path
  serverApp.get('/', (_req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  serverApp.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path === '/') return next();
    if (isDev) {
      express.static(staticPath)(req, res, next);
    } else {
      asarStatic(staticPath)(req, res, next);
    }
  });

  // SPA fallback: serve index.html for all unmatched routes
  serverApp.use((req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });

  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    const server = serverApp.listen(preferredPort, () => {
      httpServer = server;
      const port = (server.address() as import('net').AddressInfo).port;
      resolve({ server, port });
    });
  });
}

export async function initialize(options?: { appPath?: string; userDataPath?: string; isPackaged?: boolean }) {
  if (options?.appPath && options?.userDataPath) {
    setAppPaths(options.appPath, options.userDataPath);
  }

  const dbDir = path.dirname(DB_PATH);
  mkdirSync(dbDir, { recursive: true });

  dbManager.init(DB_PATH);
  initProxyAgent();
  await runMigrations();
  const { server, port } = await createServer(0, options);
  startScheduler();
  startCleaner();
  log.info('server_initialized', { port });
  return { server, port };
}
