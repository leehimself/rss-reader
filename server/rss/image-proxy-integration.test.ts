import { describe, it, expect } from 'vitest';

// Test the image proxy URL extraction logic
describe('Image proxy integration', () => {
  function extractRealImageUrl(src: string, baseUrl: string): string {
    if (src.startsWith('//')) src = 'https:' + src;
    if (src.startsWith('/')) {
      try { src = new URL(baseUrl).origin + src; } catch { return src; }
    }
    let prevSrc: string;
    do {
      prevSrc = src;
      try {
        const urlObj = new URL(src);
        if (urlObj.pathname === '/api/image' && urlObj.searchParams.has('url')) {
          const realUrl = urlObj.searchParams.get('url')!;
          if (realUrl.startsWith('http')) src = realUrl;
        }
      } catch {}
    } while (src !== prevSrc);
    return src;
  }

  it('extracts real URL from thepaper.cn proxy', () => {
    const result = extractRealImageUrl(
      'https://m.thepaper.cn/api/image?url=https%3A%2F%2Fimgpai.thepaper.cn%2Ftest.jpg',
      'https://m.thepaper.cn/detail/123'
    );
    expect(result).toBe('https://imgpai.thepaper.cn/test.jpg');
  });

  it('handles our own proxy URLs (single wrap)', () => {
    const result = extractRealImageUrl(
      '/api/image?url=https%3A%2F%2Fimg.example.com%2Fphoto.jpg&referer=https%3A%2F%2Fexample.com',
      'https://example.com/article'
    );
    expect(result).toBe('https://img.example.com/photo.jpg');
  });

  it('recursively unwraps double-wrapped proxy URLs', () => {
    const result = extractRealImageUrl(
      '/api/image?url=https%3A%2F%2Fm.thepaper.cn%2Fapi%2Fimage%3Furl%3Dhttps%253A%252F%252Fimgpai.thepaper.cn%252Ftest.jpg',
      'https://m.thepaper.cn/detail/33204408'
    );
    expect(result).toBe('https://imgpai.thepaper.cn/test.jpg');
  });

  it('handles protocol-relative URLs', () => {
    const result = extractRealImageUrl('//cdn.example.com/image.jpg', 'https://example.com');
    expect(result).toBe('https://cdn.example.com/image.jpg');
  });

  it('handles direct image URLs (no proxy)', () => {
    const result = extractRealImageUrl('https://example.com/direct.jpg', 'https://example.com');
    expect(result).toBe('https://example.com/direct.jpg');
  });

  it('handles data URLs (no change)', () => {
    const result = extractRealImageUrl('data:image/png;base64,abc123', 'https://example.com');
    expect(result).toBe('data:image/png;base64,abc123');
  });
});
