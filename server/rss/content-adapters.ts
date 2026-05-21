import { JSDOM } from 'jsdom';

export interface ContentAdapter {
  match(url: string): boolean;
  process(html: string, url: string): string;
}

// 澎湃新闻 adapter
const thePaperAdapter: ContentAdapter = {
  match: (url) => url.includes('thepaper.cn'),
  process: (html, url) => {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    // Remove lazy-load placeholders, convert data-src to src
    doc.querySelectorAll('[data-src]').forEach(el => {
      el.setAttribute('src', el.getAttribute('data-src')!);
      el.removeAttribute('data-src');
    });
    doc.querySelectorAll('[data-original]').forEach(el => {
      el.setAttribute('src', el.getAttribute('data-original')!);
      el.removeAttribute('data-original');
    });
    return doc.body.innerHTML;
  },
};

// CCTV (央视/新闻联播) adapter - extracts real article content from cluttered pages
const cctvAdapter: ContentAdapter = {
  match: (url) => url.includes('cctv.com'),
  process: (html, _url) => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const contentArea = doc.querySelector('#content_area, .content_area, [class*="content_area"]');
    if (contentArea) {
      let text = contentArea.innerHTML;
      // Extract content between repaste markers if present
      const beginIdx = text.indexOf('<!--repaste.body.begin-->');
      const endIdx = text.indexOf('<!--repaste.body.end-->');
      if (beginIdx !== -1 && endIdx !== -1 && endIdx > beginIdx) {
        text = text.substring(beginIdx + 24, endIdx);
      }
      // Extract title if available
      const titleEl = doc.querySelector('#title_area h1, #title_area h2, .title_area h1, .title_area h2');
      const titleHtml = titleEl ? `<h1>${titleEl.textContent?.trim()}</h1>` : '';
      // Remove ad comment blocks
      text = text.replace(/<!\-\-[\s\S]*?ad_\w+[\s\S]*?\-\->/gi, '');
      text = text.replace(/<!\-\-[\s\S]*?gtyb[\s\S]*?\-\->/gi, '');
      return titleHtml + text;
    }

    return html;
  },
};

// Generic lazy-load adapter (applies to all sites)
const lazyLoadAdapter: ContentAdapter = {
  match: () => true,
  process: (html, url) => {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    // Convert common lazy-load attributes to src
    const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazysrc', 'data-defer-src', 'data-img'];
    for (const attr of lazyAttrs) {
      doc.querySelectorAll(`[${attr}]`).forEach(el => {
        const src = el.getAttribute('src') || '';
        if (!src || src.startsWith('data:') || src.length < 20) {
          const value = el.getAttribute(attr)!;
          el.setAttribute('src', value);
        }
        el.removeAttribute(attr);
      });
    }
    // Remove noscript wrappers (content is already in noscript)
    doc.querySelectorAll('noscript').forEach(el => {
      const inner = el.innerHTML;
      if (inner.includes('<img')) {
        const temp = doc.createElement('div');
        temp.innerHTML = inner;
        el.replaceWith(temp);
      }
    });
    // Fix relative URLs
    doc.querySelectorAll('img[src]').forEach(el => {
      try {
        const src = el.getAttribute('src')!;
        if (src.startsWith('//')) {
          el.setAttribute('src', 'https:' + src);
        } else if (src.startsWith('/')) {
          const baseUrl = new URL(url);
          el.setAttribute('src', `${baseUrl.origin}${src}`);
        }
      } catch {}
    });
    return doc.body.innerHTML;
  },
};

const adapters: ContentAdapter[] = [cctvAdapter, thePaperAdapter, lazyLoadAdapter];

export function applyContentAdapters(html: string, url: string): string {
  let result = html;
  for (const adapter of adapters) {
    if (adapter.match(url)) {
      result = adapter.process(result, url);
    }
  }
  return result;
}
