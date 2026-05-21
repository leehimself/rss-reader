import type { Feed, Article, Category, Settings, ArticleFilters } from '@shared/types';

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const port = await window.electronAPI.getExpressPort();
  const baseUrl = import.meta.env.DEV ? '' : `http://localhost:${port}`;
  const url = `${baseUrl}${path}`;
  console.log(`[API] ${options?.method || 'GET'} ${url}`);

  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    console.error(`[API] Error ${res.status}: ${error.error || res.statusText} on ${url}`);
    throw new Error(error.error || res.statusText);
  }

  return res.json();
}

export const feedsApi = {
  getAll: () => api<Feed[]>('/api/feeds'),
  create: (data: { url: string; name?: string; category_id?: number; custom_interval?: number }) =>
    api<Feed>('/api/feeds', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; url?: string; category_id?: number; custom_interval?: number }) =>
    api<Feed>(`/api/feeds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => api<{ success: boolean }>(`/api/feeds/${id}`, { method: 'DELETE' }),
  fetch: (id: number) => api<{ new_articles: number }>(`/api/feeds/${id}/fetch`, { method: 'POST' }),
  refreshAll: () => api<{ total: number; success: number; failed: number; new_articles: number }>('/api/feeds/refresh-all', { method: 'POST' }),
  discover: (url: string) => api<{ feeds: { url: string; title: string; type: string }[] }>('/api/feeds/discover', { method: 'POST', body: JSON.stringify({ url }) }),
};

export const articlesApi = {
  getAll: (filters: ArticleFilters) => {
    const params = new URLSearchParams();
    if (filters.feed_id) params.set('feed_id', String(filters.feed_id));
    if (filters.category_id) params.set('category_id', String(filters.category_id));
    if (filters.fts) params.set('fts', filters.fts);
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.unread_only) params.set('unread_only', '1');
    if (filters.starred_only) params.set('starred_only', '1');
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    return api<{ articles: Article[]; total: number; page: number; limit: number }>(`/api/articles?${params}`);
  },
  getById: (id: number) => api<Article>(`/api/articles/${id}`),
  enrich: (id: number) => api<{ content: string; enriched: boolean }>(`/api/articles/${id}/enrich`, { method: 'POST' }),
  markRead: (id: number) => api<{ success: boolean }>(`/api/articles/${id}/read`, { method: 'POST' }),
  markStar: (id: number) => api<{ success: boolean }>(`/api/articles/${id}/star`, { method: 'POST' }),
  markUnstar: (id: number) => api<{ success: boolean }>(`/api/articles/${id}/unstar`, { method: 'POST' }),
  saveScroll: (id: number, position: number) => api<{ success: boolean }>(`/api/articles/${id}/scroll`, { method: 'POST', body: JSON.stringify({ position }) }),
  markReadBatch: (articleIds: number[]) => api<{ marked: number }>('/api/articles/mark-read', { method: 'POST', body: JSON.stringify({ article_ids: articleIds }) }),
  markAllRead: (feedId?: number, categoryId?: number) => {
    const body: any = {};
    if (feedId) body.feed_id = feedId;
    if (categoryId) body.category_id = categoryId;
    return api<{ marked: number }>('/api/articles/mark-all-read', { method: 'POST', body: JSON.stringify(body) });
  },
};

export const categoriesApi = {
  getAll: () => api<Category[]>('/api/categories'),
  create: (data: { name: string; sort_order?: number }) =>
    api<Category>('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; sort_order?: number }) =>
    api<Category>(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => api<{ success: boolean }>(`/api/categories/${id}`, { method: 'DELETE' }),
};

export const settingsApi = {
  getAll: () => api<Settings>('/api/settings'),
  update: (data: Record<string, string | number | boolean>) =>
    api<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),
  reset: () => api<Settings>('/api/settings/reset', { method: 'POST' }),
};

export const opmlApi = {
  export: () => api<string>('/api/opml/export'),
  import: (file: string, onDuplicate: 'skip' | 'update' | 'readd' = 'skip') =>
    api<{ taskId: string }>('/api/opml/import', { method: 'POST', body: JSON.stringify({ file, on_duplicate: onDuplicate }) }),
  getTask: (taskId: string) => api<any>(`/api/opml/import/${taskId}`),
};

export const backupApi = {
  create: () => api<{ path: string }>('/api/backup/create', { method: 'POST' }),
  restore: (file: string) => api<{ success: boolean; requiresRestart: boolean }>('/api/backup/restore', { method: 'POST', body: JSON.stringify({ file }) }),
  list: () => api<any[]>('/api/backup/list'),
};
