import * as cron from 'node-cron';
import { dbManager } from '../db.js';
import { settingsService } from '../settings-service.js';
import { workerDispatcher } from '../workers/worker-dispatcher.js';
import { log } from '../logger.js';
import pLimit from 'p-limit';

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

const fetchLimit = pLimit(5);

export function startScheduler() {
  if (schedulerTask) return;
  schedulerTask = cron.schedule('* * * * *', runScheduler);
  log.info('scheduler_started');
}

export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    log.info('scheduler_stopped');
  }
}

async function runScheduler() {
  if (isRunning) return;
  isRunning = true;

  try {
    const db = dbManager.getConnection();
    const globalInterval = Number(await settingsService.get('refresh_interval')) || 30;

    const feeds = db.prepare(
      `SELECT id, url, name, status, next_retry_at, custom_interval, updated_at FROM feeds`
    ).all() as { id: number; url: string; name: string; status: string; next_retry_at: string | null; custom_interval: number | null; updated_at: string }[];

    const now = new Date();

    for (const feed of feeds) {
      if (feed.status === 'error' && feed.next_retry_at) {
        const retryAt = new Date(feed.next_retry_at);
        if (now < retryAt) continue;
      }

      const lastUpdated = new Date(feed.updated_at);
      const interval = (feed.custom_interval || globalInterval) * 60 * 1000;
      if (Date.now() - lastUpdated.getTime() < interval) continue;

      await fetchLimit(async () => {
        try {
          const newArticles = await workerDispatcher.dispatchRssFetch(feed.id, feed.url, db);
          db.prepare(`UPDATE feeds SET status = 'healthy', error_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(feed.id);
          log.info('fetch_complete', { feed: feed.name, new_articles: newArticles, status: 'healthy' });
        } catch (err) {
          const errorMessage = (err as Error).message;
          db.prepare(`
            UPDATE feeds SET
              status = CASE WHEN error_count >= 10 THEN 'error' WHEN error_count >= 3 THEN 'degraded' ELSE status END,
              last_error = ?,
              error_count = error_count + 1,
              next_retry_at = datetime('now', '+' || MIN(POWER(2, error_count + 1), 64) || ' minutes'),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(errorMessage, feed.id);
          log.warn('fetch_failed', { feed: feed.name, error: errorMessage });
        }
      });
    }
  } catch (err) {
    log.error('scheduler_error', { error: (err as Error).message });
  } finally {
    isRunning = false;
  }
}

export async function fetchSingleFeed(feedId: number): Promise<number> {
  const db = dbManager.getConnection();
  const feed = db.prepare('SELECT id, url, name FROM feeds WHERE id = ?').get(feedId) as { id: number; url: string; name: string } | undefined;
  if (!feed) throw new Error('Feed not found');

  const newArticles = await workerDispatcher.dispatchRssFetch(feed.id, feed.url, db);
  db.prepare(`UPDATE feeds SET status = 'healthy', error_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(feed.id);
  return newArticles;
}
