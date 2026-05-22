import { Router } from 'express';
import { dbManager } from '../db.js';
import { applyContentAdapters } from '../rss/content-adapters.js';
import { unwrapImageProxyUrls } from '../rss/image-proxy-integration.js';
import { convertVideoLinksToEmbeds } from '../rss/video-embed.js';
import { convert } from 'html-to-text';

const router = Router();

function preCacheImages(html: string) {
  const urls = new Set<string>();
  const regex = /\/api\/image\?url=([^&"]+)/g;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const decoded = decodeURIComponent(m[1]);
    if (decoded.startsWith('http')) urls.add(decoded);
  }
  if (urls.size === 0) return;
  import('../workers/worker-dispatcher.js').then(async ({ workerDispatcher }) => {
    const limit = 2;
    const queue = [...urls];
    const worker = async () => {
      while (queue.length > 0) {
        const url = queue.shift()!;
        try { await workerDispatcher.dispatchImageDownload(url); } catch {}
      }
    };
    await Promise.all(Array.from({ length: limit }, () => worker()));
  });
}

router.get('/', (req, res) => {
  const db = dbManager.getConnection();
  const { feed_id, category_id, fts, sort, unread_only, starred_only, page, limit } = req.query;

  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  const pageNum = parseInt(page as string) || 1;
  const offset = (pageNum - 1) * limitNum;

  let where = '1=1';
  const params: any[] = [];

  if (feed_id) {
    where += ' AND a.feed_id = ?';
    params.push(Number(feed_id));
  }

  if (category_id) {
    where += ' AND f.category_id = ?';
    params.push(Number(category_id));
  }

  if (unread_only === '1' || unread_only === 'true') {
    where += ' AND a.is_read = 0';
  }

  if (starred_only === '1' || starred_only === 'true') {
    where += ' AND a.is_starred = 1';
  }

  if (fts) {
    const keyword = `%${String(fts)}%`;
    where += ` AND (a.title LIKE ? OR a.summary LIKE ? OR a.content_plain LIKE ?)`;
    params.push(keyword, keyword, keyword);
  }

  const orderBy = sort === 'oldest' ? 'a.published_at ASC' : 'a.published_at DESC';

  const joinClause = category_id ? 'JOIN feeds f ON a.feed_id = f.id' : '';

  const articles = db.prepare(
    `SELECT a.id, a.feed_id, a.title, a.link, a.link_hash, a.summary, a.content_plain, a.author,
            a.published_at, a.fetched_at, a.updated_at, a.is_read, a.read_at,
            a.is_starred, a.starred_at, a.scroll_position
     FROM articles a ${joinClause} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, String(limitNum), String(offset));

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM articles a ${joinClause} WHERE ${where}`
  ).get(...params) as { count: number };

  res.json({
    articles,
    total: total.count,
    page: pageNum,
    limit: limitNum,
  });
});

router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(Number(id));
    if (!article) throw new Error('Article not found');
    res.json(article);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/enrich', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(Number(id)) as any;
    if (!article) throw new Error('Article not found');

    let content: string;
    let content_plain: string;

    if (article.content) {
      const cleaned = applyContentAdapters(article.content, article.link);
      // Convert CCTV video codes before checking text length
      const withVideo = cleaned.replace(
        /\[!--begin:htmlVideoCode--\]([a-fA-F0-9]+).*?\[!--end:htmlVideoCode--\]/g,
        (_, vid: string) => `<div data-cctv-video="${vid}"></div>`
      );
      const cleanedPlain = convert(withVideo, { wordwrap: false, preserveNewlines: true }).trim();
      if (cleanedPlain.length > 10) {
        content = convertVideoLinksToEmbeds(withVideo);
        content = unwrapImageProxyUrls(content, article.link);
        content_plain = cleanedPlain;
        db.prepare(
          `UPDATE articles SET content = ?, content_plain = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).run(content, content_plain, Number(id));
        preCacheImages(content);
        res.json({ content, enriched: true });
        return;
      }
    }

    const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
    const enriched = await workerDispatcher.dispatchEnrich(article.link);

    const originalContent = article.content || '';
    const originalPlain = article.content_plain || '';
    const enrichedPlain = enriched.content_plain.trim();
    content = enrichedPlain.length < 100 && originalPlain.trim().length > enrichedPlain.length ? originalContent : enriched.content;
    content_plain = enrichedPlain.length < 100 && originalPlain.trim().length > enrichedPlain.length ? originalPlain : enriched.content_plain;

    db.prepare(
      `UPDATE articles SET content = ?, content_plain = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(content, content_plain, Number(id));
    preCacheImages(content);
    res.json({ content, enriched: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    db.prepare(
      `UPDATE articles SET is_read = 1, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(Number(id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/star', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    db.prepare(
      `UPDATE articles SET is_starred = 1, starred_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(Number(id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unstar', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    db.prepare(
      `UPDATE articles SET is_starred = 0, starred_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(Number(id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/scroll', (req, res, next) => {
  try {
    const { id } = req.params;
    const { position } = req.body;
    const db = dbManager.getConnection();
    db.prepare(
      `UPDATE articles SET scroll_position = ? WHERE id = ?`
    ).run(position, Number(id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/mark-read', (req, res, next) => {
  try {
    const { article_ids } = req.body;
    if (!Array.isArray(article_ids)) throw new Error('article_ids must be an array');
    const db = dbManager.getConnection();
    const placeholders = article_ids.map(() => '?').join(',');
    const result = db.prepare(
      `UPDATE articles SET is_read = 1, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`
    ).run(...article_ids);
    res.json({ marked: result.changes });
  } catch (err) {
    next(err);
  }
});

router.post('/mark-all-read', (req, res, next) => {
  try {
    const { feed_id, category_id } = req.body;
    const db = dbManager.getConnection();

    let where = 'is_read = 0';
    const params: any[] = [];

    if (feed_id) {
      where += ' AND feed_id = ?';
      params.push(Number(feed_id));
    }

    if (category_id) {
      where += ' AND feed_id IN (SELECT id FROM feeds WHERE category_id = ?)';
      params.push(Number(category_id));
    }

    const result = db.prepare(
      `UPDATE articles SET is_read = 1, read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ${where}`
    ).run(...params);

    res.json({ marked: result.changes });
  } catch (err) {
    next(err);
  }
});

// Pre-cache all article images for offline viewing
router.post('/precache-all', async (_req, res, next) => {
  try {
    const db = dbManager.getConnection();
    const articles = db.prepare('SELECT id, content FROM articles WHERE content IS NOT NULL').all() as any[];
    const urls = new Set<string>();
    for (const a of articles) {
      const regex = /\/api\/image\?url=([^&"]+)/g;
      let m;
      while ((m = regex.exec(a.content || '')) !== null) {
        const decoded = decodeURIComponent(m[1]);
        if (decoded.startsWith('http')) urls.add(decoded);
      }
    }
    if (urls.size === 0) {
      res.json({ total: 0, cached: 0 });
      return;
    }

    res.json({ total: urls.size, cached: 0, status: 'downloading' });

    const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
    let cached = 0;
    for (const url of urls) {
      try {
        await workerDispatcher.dispatchImageDownload(url);
        cached++;
      } catch {}
    }
    console.log(`[precache-all] ${cached}/${urls.size} images cached`);
  } catch (err) {
    next(err);
  }
});

export { router as articlesRouter };
