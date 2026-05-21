import { JSDOM } from 'jsdom';

export function proxyImageUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;

  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
    // Normalize protocol-relative URLs
    const resolvedSrc = src.startsWith('//') ? `https:${src}` : src;
    const referer = img.getAttribute('data-referer') || baseUrl;
    const proxyUrl = `/api/image?url=${encodeURIComponent(resolvedSrc)}&referer=${encodeURIComponent(referer)}`;
    img.setAttribute('src', proxyUrl);
    img.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
}
