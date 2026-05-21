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

// Generic lazy-load adapter (applies to all sites)
const lazyLoadAdapter: ContentAdapter = {
  match: () => true,
  process: (html, url) => {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    // Convert common lazy-load attributes to src
    const lazyAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazysrc', 'data-defer-src'];
    for (const attr of lazyAttrs) {
      doc.querySelectorAll(`[${attr}]`).forEach(el => {
        if (!el.getAttribute('src')) {
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

const adapters: ContentAdapter[] = [thePaperAdapter, lazyLoadAdapter];

export function applyContentAdapters(html: string, url: string): string {
  let result = html;
  for (const adapter of adapters) {
    if (adapter.match(url)) {
      result = adapter.process(result, url);
    }
  }
  return result;
}
