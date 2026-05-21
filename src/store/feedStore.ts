import { create } from 'zustand';
import type { Feed } from '@shared/types';
import { feedsApi } from '../lib/api';

interface FeedStore {
  feeds: Feed[];
  selectedFeedId: number | null;
  loading: boolean;
  error: string | null;
  fetchFeeds: () => Promise<void>;
  selectFeed: (id: number | null) => void;
  addFeed: (data: { url: string; name?: string; category_id?: number; custom_interval?: number }) => Promise<void>;
  updateFeed: (id: number, data: { name?: string; url?: string; category_id?: number; custom_interval?: number }) => Promise<void>;
  deleteFeed: (id: number) => Promise<void>;
  fetchFeed: (id: number) => Promise<number>;
  refreshAll: () => Promise<{ total: number; success: number; failed: number; new_articles: number }>;
}

export const useFeedStore = create<FeedStore>((set, get) => ({
  feeds: [],
  selectedFeedId: null,
  loading: false,
  error: null,

  fetchFeeds: async () => {
    set({ loading: true, error: null });
    try {
      const feeds = await feedsApi.getAll();
      set({ feeds, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  selectFeed: (id) => set({ selectedFeedId: id }),

  addFeed: async (data) => {
    await feedsApi.create(data);
    await get().fetchFeeds();
  },

  updateFeed: async (id, data) => {
    await feedsApi.update(id, data);
    await get().fetchFeeds();
  },

  deleteFeed: async (id) => {
    await feedsApi.delete(id);
    await get().fetchFeeds();
  },

  fetchFeed: async (id) => {
    const result = await feedsApi.fetch(id);
    await get().fetchFeeds();
    return result.new_articles;
  },

  refreshAll: async () => {
    const result = await feedsApi.refreshAll();
    await get().fetchFeeds();
    return result;
  },
}));
