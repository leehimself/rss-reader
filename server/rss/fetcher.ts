import Parser from 'rss-parser';
import { createHash } from 'crypto';
import { convert } from 'html-to-text';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';

const parser = new Parser();

export interface ParsedFeed {
  title: string;
  description: string;
  link: string;
  faviconUrl: string | null;
  articles: ParsedArticle[];
}

export interface ParsedArticle {
  title: string;
  link: string;
  link_hash: string;
  summary: string | null;
  content: string | null;
  content_plain: string | null;
  author: string | null;
  published_at: string | null;
}

export async function fetchAndParseFeed(url: string): Promise<ParsedFeed> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const proxyAgent = getProxyAgent();
    const response = await undiciFetch(url, {
      signal: controller.signal,
      dispatcher: proxyAgent || undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const feed = await parser.parseString(text);

    const articles: ParsedArticle[] = (feed.items || []).map((item: any) => {
      const link = item.link || '';
      const link_hash = createHash('sha256').update(link).digest('hex');
      let content = item.content || item.contentSnippet || '';
      const summary = item.summary || '';
      const description = (item as any).description || '';

      // Detect page templates with no real article body
      const isTemplate = /page_body|正在加载|加载更多|责任编辑|查看全部|阅读全文/i.test(content) && stripHtml(content).trim().length < 100;
      // Check if summary/description has actual article content
      const summaryText = summary || description;
      const summaryHasContent = summaryText.length > 100 && /<(p|div|img|span|h\d|br|li|table)[\s>]/i.test(summaryText);

      if (isTemplate && summaryHasContent) {
        content = summaryText;
      } else if (!content && summaryHasContent) {
        content = summaryText;
      } else if (content && summaryHasContent) {
        // Use whichever has more actual text
        const contentText = stripHtml(content).trim().length;
        const summaryPlain = stripHtml(summaryText).trim().length;
        if (summaryPlain > contentText * 2 && summaryPlain > 200) {
          content = summaryText;
        }
      }

      const content_plain = stripHtml(content);

      return {
        title: item.title?.slice(0, 512) || '',
        link: resolveLink(link, url),
        link_hash,
        summary: item.summary?.slice(0, 65535) || null,
        content: content?.slice(0, 16777215) || null,
        content_plain,
        author: item.creator || item.author || null,
        published_at: item.pubDate || item.isoDate || null,
      };
    });

    return {
      title: feed.title || url,
      description: feed.description || '',
      link: feed.link || url,
      faviconUrl: feed.itunes?.image || feed.image?.url || null,
      articles,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function stripHtml(html: string): string {
  try {
    return convert(html, { wordwrap: false, preserveNewlines: true }).trim();
  } catch {
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

function resolveLink(link: string, baseUrl: string): string {
  try {
    return new URL(link, baseUrl).href;
  } catch {
    return link;
  }
}
