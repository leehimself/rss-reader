import { Router } from 'express';
import { dbManager } from '../db.js';
import { hashString } from '../../shared/crypto.js';
import rateLimit from 'express-rate-limit';
import { fetchAndParseFeed } from '../rss/fetcher.js';
import pLimit from 'p-limit';

const router = Router();

const fetchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
});

router.get('/', (_req, res) => {
  const db = dbManager.getConnection();
  const feeds = db.prepare(`
    SELECT f.*, COALESCE(u.unread_count, 0) as unread_count
    FROM feeds f
    LEFT JOIN (
      SELECT feed_id, COUNT(*) as unread_count
      FROM articles
      WHERE is_read = 0
      GROUP BY feed_id
    ) u ON f.id = u.feed_id
    ORDER BY f.name
  `).all();
  res.json(feeds);
});

router.post('/', async (req, res, next) => {
  try {
    const { url, name, category_id, custom_interval } = req.body;
    if (!url) throw new Error('URL is required');

    new URL(url);

    const db = dbManager.getConnection();
    const url_hash = hashString(url);

    const existing = db.prepare('SELECT id FROM feeds WHERE url_hash = ?').get(url_hash) as { id: number } | undefined;
    if (existing) throw new Error('Feed already exists');

    const feed = await fetchAndParseFeed(url);

    const result = db.prepare(
      `INSERT INTO feeds (name, url, url_hash, category_id, custom_interval, description)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      name || feed.title,
      url,
      url_hash,
      category_id || 0,
      custom_interval || null,
      feed.description || null
    );

    const newFeed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(result.lastInsertRowid) as any;
    res.status(201).json(newFeed);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, url, category_id, custom_interval } = req.body;
    const db = dbManager.getConnection();

    const feed = db.prepare('SELECT * FROM feeds WHERE id = ?').get(Number(id)) as any;
    if (!feed) throw new Error('Feed not found');

    let url_hash = feed.url_hash;
    let finalUrl = feed.url;
    if (url && url !== feed.url) {
      new URL(url);
      url_hash = hashString(url);
      finalUrl = url;
      const existing = db.prepare('SELECT id FROM feeds WHERE url_hash = ? AND id != ?').get(url_hash, Number(id)) as { id: number } | undefined;
      if (existing) throw new Error('URL already used by another feed');
    }

    db.prepare(
      `UPDATE feeds SET name = COALESCE(?, name), url = ?, url_hash = ?, category_id = COALESCE(?, category_id), custom_interval = COALESCE(?, custom_interval), updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(name, finalUrl, url_hash, category_id, custom_interval, Number(id));

    const updated = db.prepare('SELECT * FROM feeds WHERE id = ?').get(Number(id));
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    const result = db.prepare('DELETE FROM feeds WHERE id = ?').run(Number(id));
    if (result.changes === 0) throw new Error('Feed not found');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/fetch', fetchLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    const feed = db.prepare('SELECT id, url, name FROM feeds WHERE id = ?').get(Number(id)) as { id: number; url: string; name: string } | undefined;
    if (!feed) throw new Error('Feed not found');

    const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
    const newArticles = await workerDispatcher.dispatchRssFetch(feed.id, feed.url, db);
    db.prepare(`UPDATE feeds SET status = 'healthy', error_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(feed.id);
    res.json({ new_articles: newArticles });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh-all', async (req, res, next) => {
  try {
    const db = dbManager.getConnection();
    const feeds = db.prepare('SELECT id, url, name FROM feeds').all() as { id: number; url: string; name: string }[];
    
    if (feeds.length === 0) {
      return res.json({ total: 0, success: 0, failed: 0, new_articles: 0 });
    }

    const limit = pLimit(5);
    const results = await Promise.allSettled(
      feeds.map(feed => limit(async () => {
        try {
          const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
          const newArticles = await workerDispatcher.dispatchRssFetch(feed.id, feed.url, db);
          db.prepare(`UPDATE feeds SET status = 'healthy', error_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(feed.id);
          return { id: feed.id, name: feed.name, newArticles };
        } catch (err) {
          const errorMessage = (err as Error).message;
          db.prepare(`UPDATE feeds SET status = CASE WHEN error_count >= 10 THEN 'error' WHEN error_count >= 3 THEN 'degraded' ELSE status END, last_error = ?, error_count = error_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(errorMessage, feed.id);
          throw err;
        }
      }))
    );

    let success = 0, failed = 0, newArticles = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        success++;
        newArticles += r.value.newArticles;
      } else {
        failed++;
        const feedName = feeds[results.indexOf(r)]?.name || 'unknown';
        console.error(`[refresh-all] Failed to fetch "${feedName}":`, r.reason);
      }
    }

    res.json({ total: feeds.length, success, failed, new_articles: newArticles });
  } catch (err) {
    next(err);
  }
});

export { router as feedsRouter };
