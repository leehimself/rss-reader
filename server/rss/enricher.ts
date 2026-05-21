import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { convert } from 'html-to-text';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';
import { applyContentAdapters } from './content-adapters.js';
import { convertVideoLinksToEmbeds } from './video-embed.js';
import { unwrapImageProxyUrls } from './image-proxy-integration.js';

function cleanContent(html: string): string {
  let result = html;

  // CCTV video code → video placeholder
  result = result.replace(
    /\[!--begin:htmlVideoCode--\]([a-fA-F0-9]+)[^\[]*\[!--end:htmlVideoCode--\]/g,
    (_, vid: string) => `<div data-cctv-video="${vid}" style="max-width:670px;margin:16px auto;background:#000;border-radius:6px;overflow:hidden;position:relative;cursor:pointer">
      <div style="position:relative;padding-top:56.25%">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#fff">
          <svg style="width:48px;height:48px;opacity:0.8" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          <p style="margin-top:8px;font-size:13px;opacity:0.7">CCTV 视频</p>
        </div>
      </div>
    </div>`
  );

  result = result.replace(/<div[^>]*readability-page[^>]*>/gi, '');
  result = result.replace(/<div[^>]*id="__next"[^>]*>/gi, '');
  result = result.replace(/<header[\s\S]*?<\/header>/gi, '');

  const commentMarkers = ['全部回复', '这些回复亮了', '展开全部', '查看全部回复'];
  let cutIdx = result.length;
  for (const m of commentMarkers) {
    const idx = result.indexOf(m);
    if (idx !== -1 && idx < cutIdx) cutIdx = idx;
  }
  if (cutIdx < result.length) result = result.substring(0, cutIdx);

  result = result.replace(/<div>\s*<\/div>/gi, '');
  result = result.replace(/<section>\s*<\/section>/gi, '');
  result = result.replace(/<p>\s*<\/p>/gi, '');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result;
}

function extractFallbackContent(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const doc = dom.window.document;

  for (const selector of ['article', '[role="main"]', 'main', '.main-content', '.article-content', '.post-content', '.entry-content', '#content', '#article']) {
    const el = doc.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length > 100) return el.innerHTML;
  }

  const body = doc.body;
  if (body) {
    const cloned = body.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('script, style, nav, header, footer, aside, .sidebar, .nav, .menu, .comment, .advertisement, iframe').forEach(el => el.remove());
    const text = cloned.textContent || '';
    if (text.trim().length > 50) return cloned.innerHTML;
  }

  return '';
}

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

    // Try site-specific content adapters first (before Readability)
    const adapterContent = applyContentAdapters(html, url);
    const adapterPlainLen = convert(adapterContent, { wordwrap: false }).trim().length;

    let content: string;
    if (adapterPlainLen > 50 && adapterContent !== html) {
      content = adapterContent;
    } else {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (article && article.content) {
        content = article.content;
        const plainLen = convert(content, { wordwrap: false }).trim().length;
        if (plainLen < 100) {
          const fallback = extractFallbackContent(html, url);
          if (fallback && convert(fallback, { wordwrap: false }).trim().length > plainLen) {
            content = fallback;
          }
        }
      } else {
        content = extractFallbackContent(html, url);
        if (!content) throw new Error('Could not extract article content');
      }
    }

    content = applyContentAdapters(content, url);
    content = cleanContent(content);
    content = convertVideoLinksToEmbeds(content);
    content = unwrapImageProxyUrls(content, url);

    const content_plain = convert(content, { wordwrap: false, preserveNewlines: true }).trim();

    return { content, content_plain };
  } finally {
    clearTimeout(timeout);
  }
}
