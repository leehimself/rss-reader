import { Router } from 'express';
import { XMLParser } from 'fast-xml-parser';
import { dbManager } from '../db.js';
import { hashString } from '../../shared/crypto.js';
import { randomUUID } from 'crypto';
import { fetchAndParseFeed } from '../rss/fetcher.js';
import { log } from '../logger.js';

const router = Router();

const importTasks = new Map<string, any>();

router.get('/export', (_req, res, next) => {
  try {
    const db = dbManager.getConnection();
    const feeds = db.prepare('SELECT name, url, category_id FROM feeds ORDER BY name').all() as any[];

    let opml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    opml += `<opml version="2.0">\n<head><title>RSS Reader Export</title></head>\n<body>\n`;

    for (const feed of feeds) {
      opml += `  <outline type="rss" text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" xmlUrl="${escapeXml(feed.url)}" />\n`;
    }

    opml += `</body>\n</opml>`;

    res.setHeader('Content-Type', 'text/xml');
    res.send(opml);
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  try {
    const { file, on_duplicate = 'skip' } = req.body;
    if (!file) throw new Error('File is required');

    const taskId = randomUUID();
    const task = {
      id: taskId,
      status: 'running' as string,
      current: 0,
      total: 0,
      name: 'OPML Import',
      imported: 0,
      skipped: 0,
      errors: [] as string[],
      createdAt: Date.now(),
    };
    importTasks.set(taskId, task);

    processImport(taskId, file, on_duplicate).catch(err => {
      task.status = 'error';
      task.errors.push(err.message);
      log.error('opml_import_error', { error: err.message });
    });

    res.json({ taskId });
  } catch (err) {
    next(err);
  }
});

router.get('/import/:taskId', (req, res) => {
  const task = importTasks.get(req.params.taskId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json(task);
});

async function processImport(taskId: string, xmlContent: string, onDuplicate: string) {
  const task = importTasks.get(taskId);
  if (!task) return;

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
    });

    const result = parser.parse(xmlContent);
    const outlines = result.opml?.body?.outline || [];
    const feeds = Array.isArray(outlines) ? outlines : [outlines];

    task.total = feeds.length;

    const db = dbManager.getConnection();

    for (const feed of feeds) {
      if (task.status === 'error') break;

      task.current++;

      const url = feed['@_xmlUrl'] || feed['@_htmlUrl'] || feed['@_url'];
      if (!url) {
        task.skipped++;
        continue;
      }

      const url_hash = hashString(url);
      const existing = db.prepare('SELECT id FROM feeds WHERE url_hash = ?').get(url_hash) as { id: number } | undefined;

      if (existing) {
        if (onDuplicate === 'skip') {
          task.skipped++;
          continue;
        } else if (onDuplicate === 'readd') {
          db.prepare('DELETE FROM feeds WHERE url_hash = ?').run(url_hash);
        }
      }

      try {
        const parsed = await fetchAndParseFeed(url);
        db.prepare(
          `INSERT INTO feeds (name, url, url_hash, description) VALUES (?, ?, ?, ?)`
        ).run(feed['@_text'] || parsed.title, url, url_hash, parsed.description);
        task.imported++;
      } catch (err) {
        task.errors.push(`Failed to import ${url}: ${(err as Error).message}`);
      }
    }

    task.status = 'done';
  } catch (err) {
    task.status = 'error';
    task.errors.push((err as Error).message);
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export { router as opmlRouter };
