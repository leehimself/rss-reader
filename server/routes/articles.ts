import { Router } from 'express';
import { dbManager } from '../db.js';
import { proxyImageUrls } from '../rss/image-proxy-integration.js';

const router = Router();

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
    where += ` AND a.id IN (SELECT rowid FROM articles_fts WHERE articles_fts MATCH ?)`;
    params.push(String(fts));
  }

  const orderBy = sort === 'oldest' ? 'a.published_at ASC' : 'a.published_at DESC';

  const joinClause = category_id ? 'JOIN feeds f ON a.feed_id = f.id' : '';

  const articles = db.prepare(
    `SELECT a.* FROM articles a ${joinClause} WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
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

    const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
    const { content, content_plain } = await workerDispatcher.dispatchEnrich(article.link);
    const proxiedContent = proxyImageUrls(content, article.link);
    db.prepare(
      `UPDATE articles SET content = ?, content_plain = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(proxiedContent, content_plain, Number(id));
    res.json({ content: proxiedContent, enriched: true });
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

export { router as articlesRouter };
