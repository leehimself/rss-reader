import path from 'path';

let appPath: string | undefined;
let userDataPath: string | undefined;

export function setAppPaths(app: string, userData: string) {
  appPath = app;
  userDataPath = userData;
}

export function getAppPath(): string {
  return appPath || process.cwd();
}

export function getUserDataPath(): string {
  return userDataPath || process.cwd();
}

export const isDev = appPath === undefined;
export const isProd = appPath !== undefined;

const dbDir = isDev
  ? path.join(process.cwd(), 'data')
  : getUserDataPath();

export const DB_PATH = path.join(dbDir, 'rss-reader.db');
export const LOG_DIR = isDev
  ? path.join(process.cwd(), 'logs')
  : path.join(getUserDataPath(), 'logs');
export const CACHE_DIR = path.join(getUserDataPath(), 'cache');
export const BACKUP_DIR = path.join(getUserDataPath(), 'backups');
