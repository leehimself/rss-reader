import { JSDOM } from 'jsdom';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';

export interface DiscoveredFeed {
  url: string;
  title: string;
  type: string;
}

export async function discoverFeeds(url: string): Promise<DiscoveredFeed[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const proxyAgent = getProxyAgent();
    const response = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: proxyAgent || undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('xml') || contentType.includes('rss') || contentType.includes('atom')) {
      return [{ url, title: 'RSS Feed', type: contentType.includes('atom') ? 'atom' : 'rss' }];
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const feeds: DiscoveredFeed[] = [];

    const links = doc.querySelectorAll('link[type="application/rss+xml"], link[type="application/atom+xml"], link[type="application/feed+json"]');
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href');
      const type = link.getAttribute('type') || 'rss';
      const title = link.getAttribute('title') || 'RSS Feed';
      if (href) {
        feeds.push({
          url: new URL(href, url).href,
          title,
          type: type.includes('atom') ? 'atom' : 'rss',
        });
      }
    }

    return feeds;
  } finally {
    clearTimeout(timeout);
  }
}
