import { useState, useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import { categoriesApi } from '../lib/api';
import { useToastStore } from '../store/toastStore';
import type { Category } from '@shared/types';

const RSSHUB_MIRRORS = [
  { label: 'rss.injahow.cn',  value: 'https://rss.injahow.cn' },
  { label: 'rssforever.com',  value: 'https://rsshub.rssforever.com' },
  { label: 'pseudoyu.com',    value: 'https://rsshub.pseudoyu.com' },
  { label: '自定义 URL',      value: '' },
];

interface FeedManageDialogProps {
  onClose: () => void;
  editFeed?: { id: number; name: string; url: string; category_id?: number | null; custom_interval?: number | null };
}

export default function FeedManageDialog({ onClose, editFeed }: FeedManageDialogProps) {
  const { addFeed, updateFeed } = useFeedStore();
  const showToast = useToastStore((s) => s.show);
  const [mirror, setMirror] = useState(RSSHUB_MIRRORS[0].value);
  const [route, setRoute] = useState('');
  const [customUrl, setCustomUrl] = useState(editFeed?.url || '');
  const [name, setName] = useState(editFeed?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(editFeed?.category_id ?? null);
  const [customInterval, setCustomInterval] = useState<number | null>(editFeed?.custom_interval ?? null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const isCustom = mirror === '';
  const editing = !!editFeed;

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch((err) => {
      console.error('Failed to load categories:', err);
    });
  }, []);

  const getFinalUrl = () => (isCustom ? customUrl : mirror + '/' + route.replace(/^\/+/, ''));

  const handleCreateCategory = async () => {
    const catName = newCatName.trim();
    if (!catName) return;
    try {
      const cat = await categoriesApi.create({ name: catName });
      setCategories(prev => [...prev, cat]);
      setCategoryId(cat.id);
      setShowNewCat(false);
      setNewCatName('');
      showToast(`分类「${catName}」已创建`, 'success');
    } catch (err) {
      showToast(`创建失败: ${(err as Error).message}`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = editing ? (editFeed?.url || '') : getFinalUrl();
      if (editing) {
        await updateFeed(editFeed.id, { name: name || undefined, category_id: categoryId ?? undefined, custom_interval: customInterval ?? undefined });
      } else {
        if (!url) throw new Error('请输入 URL');
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
        <h2 className="text-lg font-bold mb-4">{editing ? '编辑订阅源' : '添加订阅源'}</h2>
        <form onSubmit={handleSubmit}>
          {editing ? (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">URL</label>
              <p className="text-sm text-[var(--color-text-tertiary)] break-all">{editFeed.url}</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">RSSHub 镜像源</label>
                <div className="flex gap-2 w-full">
                  <select
                    value={mirror}
                    onChange={e => setMirror(e.target.value)}
                    className="flex-shrink-0 px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                  >
                    {RSSHUB_MIRRORS.map(m => (
                      <option key={m.label} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  {isCustom ? (
                    <input
                      type="url"
                      value={customUrl}
                      onChange={e => setCustomUrl(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                      placeholder="https://rss.example.com/feed.xml"
                      required
                    />
                  ) : (
                    <input
                      type="text"
                      value={route}
                      onChange={e => setRoute(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                      placeholder="/cctv/news"
                      required
                    />
                  )}
                </div>
                {!isCustom && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    最终地址: {mirror}/{route.replace(/^\/+/, '') || '...'}
                  </p>
                )}
              </div>
            </>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">名称（可选）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
              placeholder="自动从订阅源获取"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">分类</label>
            {showNewCat ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateCategory(); if (e.key === 'Escape') { setShowNewCat(false); setNewCatName(''); } }}
                  placeholder="输入分类名称"
                  className="flex-1 min-w-0 px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                  autoFocus
                />
                <button type="button" onClick={handleCreateCategory} className="px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:opacity-90">创建</button>
                <button type="button" onClick={() => { setShowNewCat(false); setNewCatName(''); }} className="px-3 py-2 text-sm rounded hover:bg-[var(--color-bg-tertiary)]">取消</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={categoryId ?? 0}
                  onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                  className="flex-1 min-w-0 px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
                >
                  <option value={0}>未分类</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCat(true)} className="px-3 py-2 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]" title="新建分类">+ 新建</button>
              </div>
            )}
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">刷新间隔（分钟，留空使用全局设置）</label>
            <input
              type="number"
              value={customInterval ?? ''}
              onChange={e => setCustomInterval(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)] text-sm"
              placeholder="30"
              min="1"
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded hover:bg-[var(--color-bg-tertiary)] text-sm">
              取消
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50 text-sm">
              {loading ? '添加中...' : editing ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}