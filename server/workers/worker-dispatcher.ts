import { randomUUID } from 'crypto';
import Database from 'better-sqlite3';
import { getProxyAgent } from '../proxy.js';
import { log } from '../logger.js';
import { fetchAndParseFeed } from '../rss/fetcher.js';
import { enrichArticle as doEnrichArticle } from '../rss/enricher.js';

class WorkerDispatcher {
  dispatchRssFetch(feedId: number, feedUrl: string, db: Database.Database): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const msgId = randomUUID();
      const timeout = setTimeout(() => {
        reject(new Error('Worker timeout'));
      }, 35_000);
      
      try {
        const result = await fetchAndParseFeed(feedUrl);
        clearTimeout(timeout);
        
        const articles = result.articles || [];
        const upsert = db.prepare(
          `INSERT INTO articles (feed_id, title, link, link_hash, summary, content, content_plain, author, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(feed_id, link_hash) DO UPDATE SET
             title = excluded.title,
             summary = excluded.summary,
             content = excluded.content,
             content_plain = excluded.content_plain,
             author = excluded.author,
             updated_at = CURRENT_TIMESTAMP
           WHERE excluded.content IS NOT NULL AND excluded.content != ''`
        );
        let count = 0;
        const runMany = db.transaction((rows: any[]) => {
          for (const a of rows) {
            upsert.run(
              feedId,
              a.title?.slice(0, 512) || '',
              a.link || '',
              a.link_hash || '',
              a.summary?.slice(0, 65535) || null,
              a.content?.slice(0, 16777215) || null,
              a.content_plain || null,
              a.author || null,
              a.published_at || null
            );
            count++;
          }
        });
        runMany(articles);
        resolve(count);
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  dispatchEnrich(url: string): Promise<{ content: string; content_plain: string }> {
    return doEnrichArticle(url);
  }

  dispatchImageDownload(url: string, referer?: string): Promise<{ data: Buffer; contentType: string }> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('fetch failed')), 8_000);
      try {
        const { fetch: undiciFetch } = await import('undici');
        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        };
        if (referer) headers['Referer'] = referer;

        const response = await undiciFetch(url, {
          dispatcher: getProxyAgent() || undefined,
          headers,
        });
        clearTimeout(timer);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 5 * 1024 * 1024) throw new Error('Image too large');
        
        resolve({ data: buffer, contentType: response.headers.get('content-type') || 'application/octet-stream' });
      } catch (err) {
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  terminate(): void {
    // No workers to terminate
  }
}

export const workerDispatcher = new WorkerDispatcher();
