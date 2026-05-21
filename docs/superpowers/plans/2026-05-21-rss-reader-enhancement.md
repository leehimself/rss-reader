# RSS Reader Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add news media adaptation, refresh functionality, feed management, and redesign UI in magazine/editorial style.

**Architecture:** Four independent enhancement areas sharing the same codebase. Each task is self-contained and testable. Server changes in `server/`, UI changes in `src/`.

**Tech Stack:** Electron, React 18, Express 5, SQLite (better-sqlite3), Tailwind CSS, Zustand, @mozilla/readability, DOMPurify, undici

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `server/rss/enricher.ts` | Modify | Add lazy-load image handling, site-specific adapters |
| `server/rss/content-adapters.ts` | Create | Site-specific content extraction for news sites |
| `server/rss/video-embed.ts` | Create | Detect and convert video URLs to embed iframes |
| `server/rss/image-proxy-integration.ts` | Create | Replace image URLs with proxy URLs in HTML content |
| `server/routes/feeds.ts` | Modify | Add refresh-all endpoint |
| `server/routes/articles.ts` | Modify | Apply image proxy to enriched content |
| `src/lib/api.ts` | Modify | Add refresh-all API method |
| `src/store/feedStore.ts` | Modify | Add refreshAll action |
| `src/components/FilterBar.tsx` | Modify | Add refresh-all button, new styling |
| `src/components/CategoryList.tsx` | Modify | Add feed action buttons, new styling |
| `src/components/FeedActionMenu.tsx` | Create | Feed context menu (edit, refresh, delete) |
| `src/components/FeedManageDialog.tsx` | Modify | Add category, interval, status fields |
| `src/pages/ArticlePage.tsx` | Modify | Video embeds, image proxy, new styling |
| `src/index.css` | Modify | New color system, typography, magazine style |
| `src/pages/FeedPage.tsx` | Modify | New styling |

---

### Task 1: News Media — Content Adapters and Enricher Enhancement

**Files:**
- Create: `server/rss/content-adapters.ts`
- Modify: `server/rss/enricher.ts`

- [ ] **Step 1: Create content adapters**

Create `server/rss/content-adapters.ts`:
```typescript
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
```

- [ ] **Step 2: Modify enricher to use adapters**

Modify `server/rss/enricher.ts` — add import and apply adapters after Readability parsing:

```typescript
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { convert } from 'html-to-text';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';
import { applyContentAdapters } from './content-adapters.js';

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
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error('Could not parse article content');

    let content = article.content || '';
    // Apply content adapters for lazy-load images and site-specific fixes
    content = applyContentAdapters(content, url);

    const content_plain = convert(content, { wordwrap: false, preserveNewlines: true }).trim();

    return { content, content_plain };
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add server/rss/content-adapters.ts server/rss/enricher.ts
git commit -m "feat: add content adapters for lazy-load images and news sites"
```

---

### Task 2: News Media — Video Embed Support

**Files:**
- Create: `server/rss/video-embed.ts`
- Modify: `server/rss/enricher.ts`

- [ ] **Step 1: Create video embed converter**

Create `server/rss/video-embed.ts`:
```typescript
const videoPatterns = [
  {
    match: /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`,
  },
  {
    match: /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe src="//player.bilibili.com/player.html?bvid=${id}&page=1" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" width="560" height="315"></iframe>`,
  },
  {
    match: /vimeo\.com\/(\d+)/,
    extract: (m: RegExpMatchArray) => m[1],
    embed: (id: string) => `<iframe src="https://player.vimeo.com/video/${id}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`,
  },
];

export function convertVideoLinksToEmbeds(html: string): string {
  let result = html;
  for (const pattern of videoPatterns) {
    // Find links matching the pattern and replace with embeds
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
    result = result.replace(linkRegex, (match, href, text) => {
      const m = href.match(pattern.match);
      if (m) {
        return pattern.embed(pattern.extract(m));
      }
      return match;
    });
    // Also find plain text URLs
    const urlRegex = /(?<!["'=\w])(https?:\/\/[^\s<>"']{3,200})(?![^<]*>)/g;
    result = result.replace(urlRegex, (url) => {
      const m = url.match(pattern.match);
      if (m) {
        return pattern.embed(pattern.extract(m));
      }
      return url;
    });
  }
  return result;
}
```

- [ ] **Step 2: Integrate into enricher**

Modify `server/rss/enricher.ts` — add import at top (after `applyContentAdapters` import):

```typescript
import { convertVideoLinksToEmbeds } from './video-embed.js';
```

And in the `enrichArticle` function, after the line `content = applyContentAdapters(content, url);`, add:

```typescript
    // Convert video links to embeds
    content = convertVideoLinksToEmbeds(content);
```

The full flow in enrichArticle should be:
```typescript
    let content = article.content || '';
    content = applyContentAdapters(content, url);
    content = convertVideoLinksToEmbeds(content);
    const content_plain = convert(content, { wordwrap: false, preserveNewlines: true }).trim();
```

- [ ] **Step 3: Commit**

```bash
git add server/rss/video-embed.ts server/rss/enricher.ts
git commit -m "feat: add video embed support for YouTube, Bilibili, Vimeo"
```

---

### Task 3: News Media — Image Proxy Integration

**Files:**
- Create: `server/rss/image-proxy-integration.ts`
- Modify: `server/routes/articles.ts`

- [ ] **Step 1: Create image proxy integration**

Create `server/rss/image-proxy-integration.ts`:
```typescript
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
    // Add loading="lazy" for performance
    img.setAttribute('loading', 'lazy');
  });

  return doc.body.innerHTML;
}
```

- [ ] **Step 2: Apply proxy in articles enrich route**

Modify `server/routes/articles.ts` — add import at top (after existing imports):

```typescript
import { proxyImageUrls } from '../rss/image-proxy-integration.js';
```

Then modify the enrich endpoint (`router.post('/:id/enrich')`) — replace the existing `db.prepare(...).run(content, ...)` line with:

```typescript
    const { content, content_plain } = await workerDispatcher.dispatchEnrich(article.link);
    // Apply image proxy to replace external image URLs with proxied URLs
    const proxiedContent = proxyImageUrls(content, article.link);
    db.prepare(
      `UPDATE articles SET content = ?, content_plain = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(proxiedContent, content_plain, Number(id));
    res.json({ content: proxiedContent, enriched: true });
```

- [ ] **Step 3: Commit**

```bash
git add server/rss/image-proxy-integration.ts server/routes/articles.ts
git commit -m "feat: integrate image proxy into article content rendering"
```

---

### Task 4: News Media — ArticlePage Video/Image Rendering

**Files:**
- Modify: `src/pages/ArticlePage.tsx`

- [ ] **Step 1: Update DOMPurify config to allow iframes and videos**

Modify `src/pages/ArticlePage.tsx` — add DOMPurify config:

```typescript
const sanitizeConfig = {
  ADD_TAGS: ['iframe', 'video', 'source', 'embed'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'srcdoc', 'loading'],
  ADD_DATA_URI_TAGS: ['iframe'],
};
```

Replace the existing `DOMPurify.sanitize(content)` call with `DOMPurify.sanitize(content, sanitizeConfig)`.

- [ ] **Step 2: Add CSS for video embeds and images**

Modify `src/index.css` — add styles:

```css
.article-content iframe {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}

.article-content video {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}

.article-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/ArticlePage.tsx src/index.css
git commit -m "feat: allow video embeds and improve image styling in articles"
```

---

### Task 5: Refresh Functionality

**Files:**
- Modify: `server/routes/feeds.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/store/feedStore.ts`
- Modify: `src/components/FilterBar.tsx`

- [ ] **Step 1: Add refresh-all endpoint**

Modify `server/routes/feeds.ts` — add new endpoint after the single fetch endpoint:

```typescript
import pLimit from 'p-limit';

router.post('/refresh-all', async (req, res, next) => {
  try {
    const db = dbManager.getConnection();
    const feeds = db.prepare('SELECT id, url, name FROM feeds').all() as { id: number; url: string; name: string }[];
    
    if (feeds.length === 0) {
      return res.json({ total: 0, success: 0, failed: 0, new_articles: 0 });
    }

    const limit = pLimit(5);
    const results = await Promise.allSettled(
      feeds.map(feed => limit(async () => {
        const { workerDispatcher } = await import('../workers/worker-dispatcher.js');
        const newArticles = await workerDispatcher.dispatchRssFetch(feed.id, feed.url, db);
        db.prepare(`UPDATE feeds SET status = 'healthy', error_count = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(feed.id);
        return { id: feed.id, name: feed.name, newArticles };
      }))
    );

    let success = 0, failed = 0, newArticles = 0;
    for (const r of results) {
      if (r.status === 'fulfilled') {
        success++;
        newArticles += r.value.newArticles;
      } else {
        failed++;
      }
    }

    res.json({ total: feeds.length, success, failed, new_articles: newArticles });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Add API method**

Modify `src/lib/api.ts` — add to `feedsApi`:

```typescript
refreshAll: () => api<{ total: number; success: number; failed: number; new_articles: number }>('/api/feeds/refresh-all', { method: 'POST' }),
```

- [ ] **Step 3: Add store action**

Modify `src/store/feedStore.ts` — add to the interface and implementation:

```typescript
// In interface:
refreshAll: () => Promise<{ total: number; success: number; failed: number; new_articles: number }>;

// In implementation (after fetchFeed):
refreshAll: async () => {
  const result = await feedsApi.refreshAll();
  await get().fetchFeeds();
  return result;
},
```

- [ ] **Step 4: Add refresh button to FilterBar**

Modify `src/components/FilterBar.tsx` — add refresh state and button:

```typescript
import { useState } from 'react';
// ... existing imports

export default function FilterBar() {
  // ... existing code
  const { refreshAll } = useFeedStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await refreshAll();
      // Could add toast notification here
      console.log(`刷新完成: ${result.success} 成功, ${result.failed} 失败, ${result.new_articles} 篇新文章`);
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // In the JSX, add before the mark-all-read button:
  <button 
    onClick={handleRefreshAll} 
    disabled={refreshing}
    className="px-3 py-1.5 text-sm rounded hover:bg-[var(--color-border)] disabled:opacity-50"
  >
    {refreshing ? '刷新中...' : '全部刷新'}
  </button>
```

- [ ] **Step 5: Commit**

```bash
git add server/routes/feeds.ts src/lib/api.ts src/store/feedStore.ts src/components/FilterBar.tsx
git commit -m "feat: add refresh all functionality for all feeds"
```

---

### Task 6: Feed Management — Enhanced Dialog and Sidebar Actions

**Files:**
- Create: `src/components/FeedActionMenu.tsx`
- Modify: `src/components/FeedManageDialog.tsx`
- Modify: `src/components/CategoryList.tsx`
- Modify: `src/store/feedStore.ts`

- [ ] **Step 1: Create FeedActionMenu component**

Create `src/components/FeedActionMenu.tsx`:
```typescript
import { useState, useRef, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import type { Feed } from '@shared/types';
import FeedManageDialog from './FeedManageDialog';
import clsx from 'clsx';

interface FeedActionMenuProps {
  feed: Feed;
  onRefresh: () => void;
}

export default function FeedActionMenu({ feed, onRefresh }: FeedActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { deleteFeed, fetchFeed } = useFeedStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleRefresh = async () => {
    await fetchFeed(feed.id);
    onRefresh();
    setOpen(false);
  };

  const handleDelete = async () => {
    await deleteFeed(feed.id);
    setConfirmDelete(false);
    setOpen(false);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="p-1 rounded hover:bg-[var(--color-border)] opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
            <button onClick={() => { setEditing(true); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-border)]">编辑</button>
            <button onClick={handleRefresh} className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-border)]">刷新</button>
            <button onClick={() => { setConfirmDelete(true); setOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[var(--color-border)]">删除</button>
          </div>
        )}
      </div>

      {editing && <FeedManageDialog onClose={() => setEditing(false)} editFeed={feed} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-bg)] rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2">确认删除</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">确定要删除「{feed.name}」吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded hover:bg-[var(--color-border)]">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600">删除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Enhance FeedManageDialog**

Modify `src/components/FeedManageDialog.tsx` — add category selector and refresh interval:

```typescript
import { useState, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import { categoriesApi } from '../lib/api';
import type { Category } from '@shared/types';

// In the component, add:
const [categories, setCategories] = useState<Category[]>([]);
const [categoryId, setCategoryId] = useState<number | null>(editFeed?.category_id || null);
const [customInterval, setCustomInterval] = useState<number | null>(editFeed?.custom_interval || null);

useEffect(() => {
  categoriesApi.getAll().then(setCategories).catch(() => {});
}, []);

// Add category and interval fields in the form (after name field):
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">分类</label>
  <select
    value={categoryId ?? 0}
    onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
    className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
  >
    <option value={0}>未分类</option>
    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
</div>
<div className="mb-4">
  <label className="block text-sm font-medium mb-1">刷新间隔（分钟，留空使用全局设置）</label>
  <input
    type="number"
    value={customInterval ?? ''}
    onChange={e => setCustomInterval(e.target.value ? Number(e.target.value) : null)}
    className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
    placeholder="30"
    min="1"
  />
</div>

// Update handleSubmit to include category_id and custom_interval:
if (editFeed) {
  await updateFeed(editFeed.id, { url, name, category_id: categoryId, custom_interval: customInterval });
} else {
  await addFeed({ url, name: name || undefined, category_id: categoryId, custom_interval: customInterval });
}
```

- [ ] **Step 3: Add FeedActionMenu to CategoryList**

Modify `src/components/CategoryList.tsx` — update FeedItem to show action menu:

```typescript
import FeedActionMenu from './FeedActionMenu';

// Update FeedItem component:
function FeedItem({ feed, isSelected, onSelect, onFetch }: {
  feed: Feed;
  isSelected: boolean;
  onSelect: () => void;
  onFetch: () => void;
}) {
  return (
    <div
      className={clsx(
        'group flex items-center pl-10 pr-2 py-1.5 cursor-pointer hover:bg-[var(--color-border)]',
        isSelected && 'bg-[var(--color-accent)] text-white'
      )}
      onClick={onSelect}
    >
      {/* ... existing favicon and name ... */}
      <span className="flex-1 text-sm truncate">{feed.name}</span>
      {feed.unread_count && feed.unread_count > 0 && (
        <span className={clsx('text-xs px-1.5 py-0.5 rounded-full', isSelected ? 'bg-white/20' : 'bg-[var(--color-accent)] text-white')}>
          {feed.unread_count}
        </span>
      )}
      {feed.status !== 'healthy' && (
        <svg className="w-3 h-3 ml-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )}
      <FeedActionMenu feed={feed} onRefresh={onFetch} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/FeedActionMenu.tsx src/components/FeedManageDialog.tsx src/components/CategoryList.tsx
git commit -m "feat: add feed management with edit, refresh, delete actions"
```

---

### Task 7: UI Redesign — Color System and Typography (Magazine Style)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace color system with warm magazine palette**

Modify `src/index.css` — replace the `:root` and `.dark` blocks:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-serif: 'Georgia', 'Noto Serif SC', 'Source Han Serif CN', 'STSong', 'SimSun', serif;
  --font-sans: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, -apple-system, sans-serif;
  
  /* Warm light theme */
  --color-bg: #faf8f5;
  --color-bg-secondary: #f5f2ed;
  --color-bg-tertiary: #edeae5;
  --color-text: #2c2c2c;
  --color-text-secondary: #7a756e;
  --color-text-heading: #1a1a1a;
  --color-border: #e8e4df;
  --color-accent: #c45d3e;
  --color-accent-hover: #a84d32;
  --color-badge: #d4856b;
  --color-success: #4a9e6d;
  --color-warning: #c49a3e;
  --color-error: #c45d5d;
}

.dark {
  --color-bg: #1a1a1a;
  --color-bg-secondary: #242424;
  --color-bg-tertiary: #2e2e2e;
  --color-text: #d4d0cb;
  --color-text-secondary: #8a8680;
  --color-text-heading: #e8e4df;
  --color-border: #3a3835;
  --color-accent: #d4856b;
  --color-accent-hover: #e09a82;
  --color-badge: #c45d3e;
  --color-success: #5ab87d;
  --color-warning: #d4a84e;
  --color-error: #d46b6b;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-base);
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Serif headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  color: var(--color-text-heading);
  line-height: 1.3;
}

.article-content {
  font-size: var(--font-size-base);
  line-height: 1.8;
  font-family: var(--font-sans);
}

.article-content h1, .article-content h2, .article-content h3 {
  font-family: var(--font-serif);
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}

.article-content p {
  margin-bottom: 1.2em;
  text-indent: 0;
}

.article-content img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.article-content a {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-color: rgba(196, 93, 62, 0.3);
  text-underline-offset: 2px;
}

.article-content a:hover {
  text-decoration-color: var(--color-accent);
}

.article-content blockquote {
  border-left: 3px solid var(--color-accent);
  padding-left: 1.25rem;
  margin: 1.5rem 0;
  color: var(--color-text-secondary);
  font-style: italic;
}

.article-content code {
  background: var(--color-bg-tertiary);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.85em;
}

.article-content pre {
  background: var(--color-bg-tertiary);
  padding: 1.25rem;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid var(--color-border);
}

.article-content iframe {
  max-width: 100%;
  border-radius: 8px;
  margin: 1.5rem 0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.article-content video {
  max-width: 100%;
  border-radius: 8px;
  margin: 1.5rem 0;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}

/* Smooth transitions */
* {
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "style: redesign color system and typography with magazine editorial style"
```

---

### Task 8: UI Redesign — Components (Sidebar, ArticleList, FilterBar, ArticlePage, FeedPage)

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/CategoryList.tsx`
- Modify: `src/components/FilterBar.tsx`
- Modify: `src/components/ArticleList.tsx`
- Modify: `src/pages/ArticlePage.tsx`
- Modify: `src/pages/FeedPage.tsx`

- [ ] **Step 1: Redesign Sidebar**

Modify `src/components/Sidebar.tsx` — update styling:

```typescript
// Replace the aside className:
<aside className={clsx(
  'flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200',
  sidebarCollapsed ? 'w-12' : 'w-64'
)}>

// Update the header:
<div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
  <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>RSS 阅读器</h1>
  {/* ... rest unchanged ... */}
</div>

// Update the add feed button:
<button
  onClick={() => setActiveDialog('add-feed')}
  className="flex-1 px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
>
  + 添加订阅源
</button>
```

- [ ] **Step 2: Redesign CategoryList**

Modify `src/components/CategoryList.tsx` — update styling:

```typescript
// "全部订阅源" item:
<div
  className={clsx(
    'flex items-center px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors',
    selectedFeedId === null && 'bg-[var(--color-accent)] text-white'
  )}
  onClick={() => onSelectFeed(null)}
>

// Category group header:
<div
  className="flex items-center px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)] text-sm font-medium transition-colors"
  onClick={() => setExpanded(!expanded)}
>

// FeedItem:
<div
  className={clsx(
    'group flex items-center pl-10 pr-2 py-1.5 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors',
    isSelected && 'bg-[var(--color-accent)] text-white'
  )}
  onClick={onSelect}
>

// Unread badge:
<span className={clsx('text-xs px-1.5 py-0.5 rounded-md', isSelected ? 'bg-white/20' : 'bg-[var(--color-badge)] text-white')}>
  {feed.unread_count}
</span>
```

- [ ] **Step 3: Redesign FilterBar**

Modify `src/components/FilterBar.tsx` — update styling:

```typescript
// Container:
<div className="flex items-center gap-2 p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">

// Toggle buttons:
<button
  className={clsx(
    'px-3 py-1.5 text-sm rounded-md transition-colors',
    filterUnread 
      ? 'bg-[var(--color-accent)] text-white' 
      : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
  )}
  onClick={() => setFilterUnread(!filterUnread)}
>
  未读
</button>

// Select dropdown:
<select
  value={sortBy}
  onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')}
  className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
>

// Mark all read button:
<button onClick={handleMarkAllRead} className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors">
  全部标记已读
</button>
```

- [ ] **Step 4: Redesign ArticleList**

Modify `src/components/ArticleList.tsx` — update article card styling:

```typescript
// Article card container:
<div
  className={clsx(
    'p-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors',
    isSelected && 'bg-[var(--color-bg-secondary)]'
  )}
  onClick={onSelect}
>

// Article title (serif):
<h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
  {article.title}
</h3>

// Summary text:
<p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
  {article.content_plain || article.summary}
</p>

// Meta info:
<div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-secondary)]">
  {article.author && <span>{article.author}</span>}
  <span>·</span>
  <span>{timeAgo(article.published_at)}</span>
</div>
```

- [ ] **Step 5: Redesign ArticlePage**

Modify `src/pages/ArticlePage.tsx` — update toolbar and content area:

```typescript
// Toolbar:
<div className="flex items-center gap-1 p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
  <button onClick={() => navigate('/')} className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors">
    ← 返回
  </button>
  <div className="flex-1" />
  {/* Icon buttons with subtle styling */}
  <button onClick={() => {}} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="减小字体">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
  </button>
  <button onClick={() => {}} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="增大字体">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
  </button>
  <button
    onClick={() => selectedArticle.is_starred ? markUnstar(selectedArticle.id) : markStar(selectedArticle.id)}
    className={`p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors ${selectedArticle.is_starred ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}`}
    title="收藏"
  >
    {selectedArticle.is_starred ? '★' : '☆'}
  </button>
  <button onClick={handleOpenOriginal} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="在浏览器中打开">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
  </button>
</div>

// Content area:
<div ref={contentRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto article-content ${fontSizeClass}`}>
  <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>{selectedArticle.title}</h1>
  <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mb-8 pb-4 border-b border-[var(--color-border)]">
    {selectedArticle.author && <span>{selectedArticle.author}</span>}
    {selectedArticle.published_at && (
      <>
        <span className="text-[var(--color-border)]">|</span>
        <span>{new Date(selectedArticle.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </>
    )}
  </div>
  {/* ... rest unchanged ... */}
</div>
```

- [ ] **Step 6: Redesign FeedPage**

Modify `src/pages/FeedPage.tsx` — update empty state:

```typescript
// Empty state:
<div className="flex flex-col items-center justify-center h-full">
  <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>欢迎使用 RSS 阅读器</h2>
  <p className="text-[var(--color-text-secondary)]">添加你的第一个订阅源开始使用</p>
</div>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Sidebar.tsx src/components/CategoryList.tsx src/components/FilterBar.tsx src/components/ArticleList.tsx src/pages/ArticlePage.tsx src/pages/FeedPage.tsx
git commit -m "style: redesign all components with magazine editorial style"
```

---

### Task 9: Rebuild and Verify

- [ ] **Step 1: Rebuild and start**

```bash
cd E:\code\rss-reader
npm run build
npx electron dist-electron/main.cjs
```

Expected: Electron window opens with redesigned UI, feeds load correctly, refresh button works, feed management actions work.

- [ ] **Step 2: Verify features**
- Verify warm color palette is applied (light theme)
- Verify serif fonts on headings
- Verify refresh all button triggers fetch
- Verify feed action menu (edit, refresh, delete) works
- Verify article content shows images properly
- Verify video embeds render correctly

- [ ] **Step 3: Commit final**

```bash
git add .
git commit -m "chore: rebuild and verify all enhancements"
```
