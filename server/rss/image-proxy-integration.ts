import { JSDOM } from 'jsdom';

export function proxyImageUrls(html: string, baseUrl: string): string {
  const dom = new JSDOM(html, { url: baseUrl });
  const doc = dom.window.document;

  doc.querySelectorAll('img[src]').forEach(img => {
    const src = img.getAttribute('src')!;
    if (src.startsWith('data:') || src.startsWith('blob:')) return;
    const referer = img.getAttribute('data-referer') || baseUrl;
    const proxyUrl = `/api/image?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}`;
    img.setAttribute('src', proxyUrl);
    img.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
}
