import * as cron from 'node-cron';
import { dbManager } from '../db.js';
import { settingsService } from '../settings-service.js';
import { log } from '../logger.js';

let cleanerTask: cron.ScheduledTask | null = null;

export function startCleaner() {
  if (cleanerTask) return;
  cleanerTask = cron.schedule('0 3 * * *', runCleanup);
  log.info('cleaner_started');
}

export function stopCleaner() {
  if (cleanerTask) {
    cleanerTask.stop();
    cleanerTask = null;
    log.info('cleaner_stopped');
  }
}

async function runCleanup() {
  try {
    const db = dbManager.getConnection();
    const maxKeepDays = Number(await settingsService.get('max_keep_days')) || 90;
    const maxArticlesPerFeed = Number(await settingsService.get('max_articles_per_feed')) || 500;

    const timeResult = db.prepare(`
      DELETE FROM articles
      WHERE is_read = 1
        AND is_starred = 0
        AND fetched_at < datetime('now', '-' || ? || ' days')
    `).run(String(maxKeepDays));

    log.info('cleanup_by_time', { removed: timeResult.changes });

    const feeds = db.prepare('SELECT id FROM feeds').all() as { id: number }[];
    let totalRemoved = 0;

    for (const feed of feeds) {
      const result = db.prepare(`
        DELETE FROM articles
        WHERE is_read = 1
          AND is_starred = 0
          AND id NOT IN (
            SELECT id FROM articles
            WHERE feed_id = ?
            ORDER BY published_at DESC
            LIMIT ?
          )
          AND feed_id = ?
      `).run(feed.id, String(maxArticlesPerFeed), feed.id);
      totalRemoved += result.changes;
    }

    log.info('cleanup_complete', { removed: totalRemoved });
  } catch (err) {
    log.error('cleanup_error', { error: (err as Error).message });
  }
}
