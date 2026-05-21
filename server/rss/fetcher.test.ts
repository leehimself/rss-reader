import { describe, it, expect } from 'vitest';

// Test the content extraction logic from the fetcher
describe('Content extraction', () => {
  // Simulate the fetcher's content selection logic
  function selectContent(itemContent: string, itemSummary: string, itemContentSnippet: string, itemDescription?: string): string {
    let content = itemContent || itemContentSnippet || '';
    const summary = itemSummary || '';
    const description = itemDescription || '';

    const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').trim();

    const isTemplate = /page_body|正在加载|加载更多|责任编辑|查看全部|阅读全文/i.test(content) && stripHtml(content).length < 100;
    const summaryText = summary || description;
    const summaryHasContent = summaryText.length > 100 && /<(p|div|img|span|h\d|br|li|table)[\s>]/i.test(summaryText);

    if (isTemplate && summaryHasContent) {
      content = summaryText;
    } else if (!content && summaryHasContent) {
      content = summaryText;
    } else if (content && summaryHasContent) {
      const contentText = stripHtml(content).length;
      const summaryPlain = stripHtml(summaryText).length;
      if (summaryPlain > contentText * 2 && summaryPlain > 200) {
        content = summaryText;
      }
    }

    return content;
  }

  it('uses content when available', () => {
    const result = selectContent('<p>Hello World</p>', '', '');
    expect(result).toBe('<p>Hello World</p>');
  });

  it('falls back to contentSnippet when content is empty', () => {
    const result = selectContent('', '', 'Plain text snippet');
    expect(result).toBe('Plain text snippet');
  });

  it('uses summary when content is page template', () => {
    const result = selectContent(
      '<div id="page_body">正在加载...</div>',
      '<p>Actual article text that is long enough to pass the 100 character threshold. This needs more padding to pass the check for summary content.</p>',
      ''
    );
    expect(result).toContain('Actual article text');
  });

  it('uses summary when content is empty', () => {
    const result = selectContent(
      '',
      '<p>Rich content from description field that has enough text to pass the threshold. More text needed to reach 100 chars for the summaryHasContent check.</p>',
      ''
    );
    expect(result).toContain('Rich content');
  });

  it('prefers summary when it has significantly more content', () => {
    const short = '<p>Short.</p>';
    const long = '<p>' + 'Long text. '.repeat(50) + '</p>';
    const result = selectContent(short, long, '');
    expect(result).toBe(long);
  });

  it('keeps content when summary is not much richer', () => {
    const content = '<p>Normal article content here. '.repeat(5) + '</p>';
    const summary = '<p>Short summary</p>';
    const result = selectContent(content, summary, '');
    expect(result).toBe(content);
  });

  it('handles CCTV template with empty text', () => {
    const template = '<div id="page_body"><div class="nav">首页 新闻频道 > 新闻中心</div></div>';
    const result = selectContent(template, '<p>Real article with CCTV content that is long enough to pass the threshold checks for summary content detection. Additional text for length.</p>', '');
    expect(result).toContain('Real article');
  });
});
