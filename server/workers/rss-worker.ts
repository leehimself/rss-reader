import { parentPort } from 'worker_threads';
import Parser from 'rss-parser';
import { createHash } from 'crypto';
import { convert } from 'html-to-text';
import pLimit from 'p-limit';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const parser = new Parser();
let proxyAgent: ProxyAgent | undefined;

const fetchLimit = pLimit(5);

parentPort?.on('message', async (msg: any) => {
  if (msg.type === 'init') {
    if (msg.proxyUrl) {
      proxyAgent = new ProxyAgent(msg.proxyUrl);
    }
    return;
  }

  if (msg.type === 'fetch') {
    try {
      const result = await fetchLimit(async () => fetchFeed(msg.url));
      parentPort?.postMessage({ msgId: msg.msgId, type: 'result', articles: result });
    } catch (err) {
      parentPort?.postMessage({ msgId: msg.msgId, type: 'error', message: (err as Error).message });
    }
  }
});

async function fetchFeed(url: string): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: proxyAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const feed = await parser.parseString(text);

    const articles = feed.items.map((item: any) => {
      const link = item.link || '';
      const link_hash = createHash('sha256').update(link).digest('hex');
      const content = item.content || item.contentSnippet || '';
      const content_plain = stripHtml(content);

      return {
        title: item.title?.slice(0, 512) || '',
        link: resolveLink(link, url),
        link_hash,
        summary: item.summary?.slice(0, 65535) || null,
        content: content?.slice(0, 16777215) || null,
        content_plain,
        author: item.creator || item.author || null,
        published_at: item.pubDate || item.isoDate || null,
      };
    });

    return articles;
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html: string): string {
  try {
    return convert(html, { wordwrap: false, preserveNewlines: true }).trim();
  } catch {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

function resolveLink(link: string, baseUrl: string): string {
  try {
    return new URL(link, baseUrl).href;
  } catch {
    return link;
  }
}
