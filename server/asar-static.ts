import { readFileSync, statSync } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

const mimeTypes: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const etagCache = new Map<string, string>();
const ETAG_CACHE_MAX = 1000;

function getETag(filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const key = normalizedPath.includes('dist/') ? normalizedPath.slice(normalizedPath.indexOf('dist/')) : normalizedPath;
  if (etagCache.has(key)) return etagCache.get(key)!;
  try {
    const content = readFileSync(filePath);
    const hash = createHash('md5').update(content).digest('hex');
    if (etagCache.size >= ETAG_CACHE_MAX) {
      const firstKey = etagCache.keys().next().value;
      if (firstKey) etagCache.delete(firstKey);
    }
    etagCache.set(key, hash);
    return hash;
  } catch {
    return '';
  }
}

export function asarStatic(staticPath: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const safePath = path.normalize(req.path).replace(/^(\.\.(\/|\\|$))+/, '');
    const isRoot = safePath === '/' || safePath === '\\' || safePath === '.';
    let filePath = path.join(staticPath, isRoot ? 'index.html' : safePath);
    if (!filePath.startsWith(staticPath)) {
      return res.status(403).end();
    }

    try {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      const stats = statSync(filePath);
      const etag = stats.size > 1024 * 1024
        ? `"${stats.mtimeMs}-${stats.size}"`
        : getETag(filePath);

      if (req.headers['if-none-match'] === etag) {
        res.status(304).end();
        return;
      }

      const content = readFileSync(filePath);
      res.setHeader('Content-Type', contentType);
      res.setHeader('ETag', etag);

      if (/\.[a-f0-9]{8}\./.test(req.path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }

      res.send(content);
    } catch (err) {
      next();
    }
  };
}
