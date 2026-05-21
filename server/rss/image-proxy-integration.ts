import { JSDOM } from 'jsdom';

export function extractRealImageUrl(src: string, baseUrl: string): string {
  if (src.startsWith('//')) {
    src = `https:${src}`;
  }
  if (src.startsWith('/')) {
    try {
      const baseUrlObj = new URL(baseUrl);
      src = `${baseUrlObj.origin}${src}`;
    } catch {
      return src;
    }
  }

  let prevSrc: string;
  do {
    prevSrc = src;
    try {
      const urlObj = new URL(src);
      // Unwrap known proxy patterns where the real URL is in a query param
      const proxyParam = urlObj.searchParams.get('url') || urlObj.searchParams.get('src') || urlObj.searchParams.get('img');
      if (proxyParam && proxyParam.startsWith('http')) {
        // Known proxy hosts or generic: path doesn't look like an image file
        if (urlObj.hostname === 'wsrv.nl' || urlObj.pathname === '/api/image' || !/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(urlObj.pathname)) {
          src = proxyParam;
          continue;
        }
      }
    } catch {}
  } while (src !== prevSrc);

  return src;
}

export function proxyImageUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;

  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;

    const resolvedSrc = extractRealImageUrl(src, baseUrl);
    if (!resolvedSrc.startsWith('http://') && !resolvedSrc.startsWith('https://')) return;

    const referer = img.getAttribute('data-referer') || baseUrl;
    const proxyUrl = `/api/image?url=${encodeURIComponent(resolvedSrc)}&referer=${encodeURIComponent(referer)}`;
    img.setAttribute('src', proxyUrl);
    img.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
}

// Unwrap nested image proxy URLs to direct CDN URLs (no re-proxying)
export function unwrapImageProxyUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;
  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
    const real = extractRealImageUrl(src, baseUrl);
    if (real !== src && real.startsWith('http')) {
      img.setAttribute('src', real);
    }
  });
  return doc.body.innerHTML;
}
