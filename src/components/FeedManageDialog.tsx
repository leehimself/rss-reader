import { useState, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import { categoriesApi } from '../lib/api';
import type { Category } from '@shared/types';

interface FeedManageDialogProps {
  onClose: () => void;
  editFeed?: { id: number; name: string; url: string; category_id?: number | null; custom_interval?: number | null };
}

export default function FeedManageDialog({ onClose, editFeed }: FeedManageDialogProps) {
  const { addFeed, updateFeed } = useFeedStore();
  const [url, setUrl] = useState(editFeed?.url || '');
  const [name, setName] = useState(editFeed?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(editFeed?.category_id ?? null);
  const [customInterval, setCustomInterval] = useState<number | null>(editFeed?.custom_interval ?? null);

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (editFeed) {
        await updateFeed(editFeed.id, { url, name, category_id: categoryId ?? undefined, custom_interval: customInterval ?? undefined });
      } else {
        await addFeed({ url, name: name || undefined, category_id: categoryId ?? undefined, custom_interval: customInterval ?? undefined });
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg)] rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{editFeed ? '编辑订阅源' : '添加订阅源'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">网址</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
              placeholder="https://example.com/feed.xml"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">名称（可选）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
              placeholder="自动从订阅源获取"
            />
          </div>
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
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded hover:bg-[var(--color-border)]">
              取消
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
              {loading ? '添加中...' : editFeed ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}