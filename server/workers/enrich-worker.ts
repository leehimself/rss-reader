import { parentPort } from 'worker_threads';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { convert } from 'html-to-text';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

let proxyAgent: ProxyAgent | undefined;

parentPort?.on('message', async (msg: any) => {
  if (msg.type === 'init') {
    if (msg.proxyUrl) {
      proxyAgent = new ProxyAgent(msg.proxyUrl);
    }
    return;
  }

  if (msg.type === 'enrich') {
    try {
      const result = await enrichArticle(msg.url);
      parentPort?.postMessage({ msgId: msg.msgId, type: 'result', ...result });
    } catch (err) {
      parentPort?.postMessage({ msgId: msg.msgId, type: 'error', message: (err as Error).message });
    }
  }
});

async function enrichArticle(url: string): Promise<{ content: string; content_plain: string }> {
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

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error('Could not parse article content');

    const content = article.content || '';
    const content_plain = convert(content, { wordwrap: false, preserveNewlines: true }).trim();

    return { content, content_plain };
  } finally {
    clearTimeout(timeout);
  }
}
