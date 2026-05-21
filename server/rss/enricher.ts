import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { convert } from 'html-to-text';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';
import { applyContentAdapters } from './content-adapters.js';
import { convertVideoLinksToEmbeds } from './video-embed.js';

export async function enrichArticle(url: string): Promise<{ content: string; content_plain: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: getProxyAgent() || undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error('Could not parse article content');

    let content = article.content || '';
    // Apply content adapters for lazy-load images and site-specific fixes
    content = applyContentAdapters(content, url);
    // Convert video links to embeds
    content = convertVideoLinksToEmbeds(content);

    const content_plain = convert(content, { wordwrap: false, preserveNewlines: true }).trim();

    return { content, content_plain };
  } finally {
    clearTimeout(timeout);
  }
}
