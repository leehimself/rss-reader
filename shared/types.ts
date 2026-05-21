import { z } from 'zod';

// === Zod schemas (backend only) ===
export const FeedSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().url(),
  url_hash: z.string(),
  category_id: z.number().nullable(),
  favicon_url: z.string().nullable(),
  description: z.string().nullable(),
  custom_interval: z.number().nullable(),
  status: z.enum(['healthy', 'degraded', 'error']),
  last_error: z.string().nullable(),
  error_count: z.number(),
  next_retry_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  unread_count: z.number().optional(),
});

export const ArticleSchema = z.object({
  id: z.number(),
  feed_id: z.number(),
  title: z.string(),
  link: z.string(),
  link_hash: z.string(),
  summary: z.string().nullable(),
  content: z.string().nullable(),
  content_plain: z.string().nullable(),
  author: z.string().nullable(),
  published_at: z.string().nullable(),
  fetched_at: z.string(),
  updated_at: z.string(),
  is_read: z.number(),
  read_at: z.string().nullable(),
  is_starred: z.number(),
  starred_at: z.string().nullable(),
  scroll_position: z.number(),
});

export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  is_default: z.number(),
  unread_count: z.number().optional(),
});

// === TypeScript types (shared) ===
export type Feed = z.infer<typeof FeedSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type Category = z.infer<typeof CategorySchema>;

export type AddFeedPayload = {
  url: string;
  name?: string;
  category_id?: number;
  custom_interval?: number;
};

export type ArticleFilters = {
  feed_id?: number | null;
  category_id?: number | null;
  search?: string;
  fts?: string;
  sort?: 'newest' | 'oldest';
  unread_only?: boolean;
  starred_only?: boolean;
  page?: number;
  limit?: number;
};

export type Settings = {
  refresh_interval: number;
  theme: string;
  max_keep_days: number;
  max_articles_per_feed: number;
  enable_notifications: boolean;
  open_at_login: boolean;
  minimize_to_tray: boolean;
  log_level: string;
};

export type OpmlImportTask = {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'timeout';
  current: number;
  total: number;
  name: string;
  imported: number;
  skipped: number;
  errors: string[];
  createdAt: number;
};
