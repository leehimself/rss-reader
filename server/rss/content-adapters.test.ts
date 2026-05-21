import { describe, it, expect } from 'vitest';

// Test content adapters independently
describe('Content adapters', () => {
  const lazyLoadAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazysrc', 'data-defer-src', 'data-img'];

  function fixLazyImages(html: string): string {
    let result = html;
    for (const attr of lazyLoadAttrs) {
      const regex = new RegExp(`<img[^>]*${attr}="([^"]*)"[^>]*>`, 'gi');
      result = result.replace(regex, (match) => {
        const srcMatch = match.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        if (!srcMatch) return match;
        const src = srcMatch[1];
        if (match.includes(' src=')) return match;
        return match.replace(/<img /, `<img src="${src}" `);
      });
    }
    return result;
  }

  function fixProtocolRelativeUrls(html: string): string {
    return html.replace(/src="\/\/([^"]+)"/g, 'src="https://$1"');
  }

  function fixAbsolutePathUrls(html: string, baseUrl: string): string {
    const origin = new URL(baseUrl).origin;
    return html.replace(/src="\/([^"]+)"/g, `src="${origin}/$1"`);
  }

  it('converts data-src to src', () => {
    const result = fixLazyImages('<img data-src="https://example.com/img.jpg">');
    expect(result).toContain('src="https://example.com/img.jpg"');
  });

  it('converts data-original to src', () => {
    const result = fixLazyImages('<img class="lazy" data-original="https://example.com/pic.png">');
    expect(result).toContain('src="https://example.com/pic.png"');
  });

  it('converts data-lazy-src to src', () => {
    const result = fixLazyImages('<img data-lazy-src="https://example.com/lazy.jpg">');
    expect(result).toContain('src="https://example.com/lazy.jpg"');
  });

  it('does not overwrite existing src', () => {
    const input = '<img src="existing.jpg" data-src="fallback.jpg">';
    const result = fixLazyImages(input);
    expect(result).toContain('src="existing.jpg"');
  });

  it('handles data-img (CCTV pattern)', () => {
    const result = fixLazyImages('<img class="lazy" data-img="//img.cctv.com/photo.png">');
    expect(result).toContain('src="//img.cctv.com/photo.png"');
  });

  it('fixes protocol-relative URLs', () => {
    const result = fixProtocolRelativeUrls('<img src="//cdn.example.com/image.jpg">');
    expect(result).toBe('<img src="https://cdn.example.com/image.jpg">');
  });

  it('fixes absolute path URLs', () => {
    const result = fixAbsolutePathUrls('<img src="/images/photo.jpg">', 'https://news.cctv.com/article/1');
    expect(result).toBe('<img src="https://news.cctv.com/images/photo.jpg">');
  });

  it('handles CCTV video code conversion', () => {
    const input = '<p>[!--begin:htmlVideoCode--]abc123def,0,1,16:9,newPlayer[!--end:htmlVideoCode--]</p>';
    const re = /\[!--begin:htmlVideoCode--\]([a-fA-F0-9]+).*?\[!--end:htmlVideoCode--\]/g;
    const result = input.replace(re, (_, vid: string) => `<div data-cctv-video="${vid}"></div>`);
    expect(result).toContain('data-cctv-video="abc123def"');
    expect(result).not.toContain('htmlVideoCode');
  });

  it('handles multiple CCTV video codes in content', () => {
    const input = '<p>[!--begin:htmlVideoCode--]abc123def456,0,1,16:9,newPlayer[!--end:htmlVideoCode--]</p><p>[!--begin:htmlVideoCode--]789abc123def,0,1,16:9,newPlayer[!--end:htmlVideoCode--]</p>';
    const re = /\[!--begin:htmlVideoCode--\]([a-fA-F0-9]+).*?\[!--end:htmlVideoCode--\]/g;
    const result = input.replace(re, (_, vid: string) => `<div data-cctv-video="${vid}"></div>`);
    expect(result).toContain('data-cctv-video="abc123def456"');
    expect(result).toContain('data-cctv-video="789abc123def"');
  });

  it('cleans comment markers from content', () => {
    const commentMarkers = ['全部回复', '这些回复亮了', '展开全部', '查看全部回复'];
    const input = '<p>Good content</p><p>全部回复</p><p>Junk here</p>';
    let result = input;
    let cutIdx = result.length;
    for (const m of commentMarkers) {
      const idx = result.indexOf(m);
      if (idx !== -1 && idx < cutIdx) cutIdx = idx;
    }
    if (cutIdx < result.length) result = result.substring(0, cutIdx);
    expect(result).toBe('<p>Good content</p><p>');
  });
});
