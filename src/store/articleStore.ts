import { create } from 'zustand';
import type { Article, ArticleFilters } from '@shared/types';
import { articlesApi } from '../lib/api';

interface ArticleStore {
  articles: Article[];
  selectedArticle: Article | null;
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: string | null;
  selectedIds: Set<number>;
  fetchArticles: (filters: ArticleFilters) => Promise<void>;
  selectArticle: (article: Article | null) => void;
  markRead: (id: number) => Promise<void>;
  markStar: (id: number) => Promise<void>;
  markUnstar: (id: number) => Promise<void>;
  markReadBatch: (ids: number[]) => Promise<void>;
  markAllRead: (feedId?: number, categoryId?: number) => Promise<void>;
  toggleSelect: (id: number) => void;
  clearSelection: () => void;
  selectRange: (from: number, to: number) => void;
}

export const useArticleStore = create<ArticleStore>((set) => ({
  articles: [],
  selectedArticle: null,
  total: 0,
  page: 1,
  limit: 20,
  loading: false,
  error: null,
  selectedIds: new Set(),

  fetchArticles: async (filters) => {
    set({ loading: true, error: null });
    try {
      const result = await articlesApi.getAll(filters);
      set({ articles: result.articles, total: result.total, page: result.page, limit: result.limit, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectArticle: (article) => set({ selectedArticle: article }),

  markRead: async (id) => {
    await articlesApi.markRead(id);
    set((state) => ({
      articles: state.articles.map(a => a.id === id ? { ...a, is_read: 1, read_at: new Date().toISOString() } : a),
      selectedArticle: state.selectedArticle?.id === id ? { ...state.selectedArticle, is_read: 1, read_at: new Date().toISOString() } : state.selectedArticle,
    }));
  },

  markStar: async (id) => {
    await articlesApi.markStar(id);
    set((state) => ({
      articles: state.articles.map(a => a.id === id ? { ...a, is_starred: 1, starred_at: new Date().toISOString() } : a),
      selectedArticle: state.selectedArticle?.id === id ? { ...state.selectedArticle, is_starred: 1, starred_at: new Date().toISOString() } : state.selectedArticle,
    }));
  },

  markUnstar: async (id) => {
    await articlesApi.markUnstar(id);
    set((state) => ({
      articles: state.articles.map(a => a.id === id ? { ...a, is_starred: 0, starred_at: null } : a),
      selectedArticle: state.selectedArticle?.id === id ? { ...state.selectedArticle, is_starred: 0, starred_at: null } : state.selectedArticle,
    }));
  },

  markReadBatch: async (ids) => {
    await articlesApi.markReadBatch(ids);
    set((state) => ({
      articles: state.articles.map(a => ids.includes(a.id) ? { ...a, is_read: 1, read_at: new Date().toISOString() } : a),
      selectedIds: new Set(),
    }));
  },

  markAllRead: async (feedId, categoryId) => {
    await articlesApi.markAllRead(feedId, categoryId);
    set((state) => ({
      articles: state.articles.map(a => ({ ...a, is_read: 1, read_at: new Date().toISOString() })),
    }));
  },

  toggleSelect: (id) => {
    set((state) => {
      const newIds = new Set(state.selectedIds);
      if (newIds.has(id)) newIds.delete(id);
      else newIds.add(id);
      return { selectedIds: newIds };
    });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  selectRange: (from, to) => {
    set((state) => {
      const ids = state.articles.map(a => a.id);
      const fromIdx = ids.indexOf(from);
      const toIdx = ids.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return { selectedIds: new Set() };
      const start = Math.min(fromIdx, toIdx);
      const end = Math.max(fromIdx, toIdx);
      const newIds = new Set(ids.slice(start, end + 1));
      return { selectedIds: newIds };
    });
  },
}));
