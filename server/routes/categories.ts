import { Router } from 'express';
import Database from 'better-sqlite3';
import { dbManager } from '../db.js';

const router = Router();

function generateCategoryId(db: Database.Database): number {
  const result = db.transaction(() => {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('category_counter') as { value: string } | undefined;
    const current = row ? parseInt(row.value) : 0;
    const next = current + 1;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('category_counter', String(next));
    return next;
  })();
  return result;
}

router.get('/', (_req, res) => {
  const db = dbManager.getConnection();
  const categories = db.prepare(`
    SELECT c.*, COALESCE(u.unread_count, 0) as unread_count
    FROM categories c
    LEFT JOIN (
      SELECT f.category_id, COUNT(*) as unread_count
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE a.is_read = 0
      GROUP BY f.category_id
    ) u ON c.id = u.category_id
    ORDER BY c.sort_order
  `).all();
  res.json(categories);
});

router.post('/', (req, res, next) => {
  try {
    const { name, sort_order } = req.body;
    if (!name) throw new Error('Name is required');
    const db = dbManager.getConnection();
    const id = generateCategoryId(db);
    db.prepare(
      `INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)`
    ).run(id, name, sort_order || 0);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sort_order } = req.body;
    const db = dbManager.getConnection();
    db.prepare(
      `UPDATE categories SET name = COALESCE(?, name), sort_order = COALESCE(?, sort_order) WHERE id = ?`
    ).run(name, sort_order, Number(id));
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id));
    res.json(category);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const db = dbManager.getConnection();
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(Number(id)) as any;
    if (!category) throw new Error('Category not found');
    if (category.is_default) throw new Error('Cannot delete default category');
    db.prepare('DELETE FROM categories WHERE id = ?').run(Number(id));
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export { router as categoriesRouter };
