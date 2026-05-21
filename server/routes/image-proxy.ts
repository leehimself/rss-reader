import { Router } from 'express';
import { createHmac, createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import { CACHE_DIR } from '../config.js';
import { log } from '../logger.js';

const router = Router();

const IMAGE_CACHE_DIR = path.join(CACHE_DIR, 'images');
const HMAC_KEY_FILE = path.join(CACHE_DIR, 'hmac-key');

function getHmacKey(): Buffer {
  if (!existsSync(HMAC_KEY_FILE)) {
    mkdirSync(CACHE_DIR, { recursive: true });
    const key = createHash('sha256').update(Date.now().toString()).digest();
    writeFileSync(HMAC_KEY_FILE, key);
    return key;
  }
  return readFileSync(HMAC_KEY_FILE);
}

function getCacheKey(url: string): string {
  const key = getHmacKey();
  return createHmac('sha256', key).update(url).digest('hex');
}

router.get('/', async (req, res, next) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    log.info('image_proxy_request', { url: url.slice(0, 100) });

    const key = getCacheKey(url);
    const cachePath = path.join(IMAGE_CACHE_DIR, key);
    const metaPath = cachePath + '.meta';

    if (existsSync(cachePath)) {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      res.setHeader('Content-Type', meta.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(cachePath);
      return;
    }

    const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
    const { data, contentType } = await workerDispatcher.dispatchImageDownload(url, req.query.referer as string);

    mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
    writeFileSync(cachePath, data);
    writeFileSync(metaPath, JSON.stringify({ contentType, cachedAt: Date.now() }));

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(data);
  } catch (err) {
    const errMsg = (err as Error).message;
    if (errMsg !== 'fetch failed') {
      log.warn('image_proxy_error', { url: String(req.query.url).slice(0, 80), error: errMsg });
    }
    const transparentPixel = Buffer.from('R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');
    try {
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(transparentPixel);
    } catch {}
  }
});

export { router as imageProxyRouter };
