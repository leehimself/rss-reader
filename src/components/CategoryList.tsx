import { useState, useMemo, useEffect } from 'react';
import type { Feed, Category } from '@shared/types';
import { useFeedStore } from '../store/feedStore';
import { categoriesApi } from '../lib/api';
import { useToastStore } from '../store/toastStore';
import clsx from 'clsx';
import FeedActionMenu from './FeedActionMenu';

interface CategoryListProps {
  feeds: Feed[];
  selectedFeedId: number | null;
  onSelectFeed: (id: number | null) => void;
}

export default function CategoryList({ feeds, selectedFeedId, onSelectFeed }: CategoryListProps) {
  const { fetchFeed } = useFeedStore();
  const [categories, setCategories] = useState<Category[]>([]);

  const loadCategories = () => {
    categoriesApi.getAll().then(setCategories).catch(() => {});
  };

  useEffect(() => { loadCategories(); }, [feeds.length]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const groups = useMemo(() => {
    const catMap = new Map<number, { category: { id: number; name: string; sort_order: number; is_default: number }; feeds: Feed[] }>();
    for (const feed of feeds) {
      const catId = feed.category_id ?? 0;
      if (!catMap.has(catId)) {
        const name = catId === 0 ? '未分类' : (categoryMap.get(catId) || `分类 ${catId}`);
        const cat = categories.find(c => c.id === catId);
        catMap.set(catId, { category: { id: catId, name, sort_order: cat?.sort_order ?? 0, is_default: cat?.is_default ?? (catId === 0 ? 1 : 0) }, feeds: [] });
      }
      catMap.get(catId)!.feeds.push(feed);
    }
    return Array.from(catMap.values()).sort((a, b) => a.category.sort_order - b.category.sort_order);
  }, [feeds, categoryMap, categories]);

  return (
    <div className="py-2">
      <div
        className={clsx(
          'flex items-center px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors',
          selectedFeedId === null && 'bg-[var(--color-accent-light)]'
        )}
        onClick={() => onSelectFeed(null)}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        <span className="flex-1 text-sm">全部订阅源</span>
        <span className="text-xs opacity-70">{feeds.length}</span>
      </div>

      {groups.map(({ category, feeds: catFeeds }) => (
        <CategoryGroup
          key={category.id}
          category={category}
          feeds={catFeeds}
          selectedFeedId={selectedFeedId}
          onSelectFeed={onSelectFeed}
          onFetchFeed={fetchFeed}
          onCategoryChanged={loadCategories}
        />
      ))}
    </div>
  );
}

function CategoryGroup({ category, feeds, selectedFeedId, onSelectFeed, onFetchFeed, onCategoryChanged }: {
  category: { id: number; name: string; is_default: number };
  feeds: Feed[];
  selectedFeedId: number | null;
  onSelectFeed: (id: number | null) => void;
  onFetchFeed: (id: number) => Promise<number>;
  onCategoryChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const showToast = useToastStore((s) => s.show);

  const handleRename = async () => {
    const name = editName.trim();
    if (!name || name === category.name) { setEditing(false); return; }
    try {
      await categoriesApi.update(category.id, { name });
      onCategoryChanged();
      showToast(`分类已重命名为「${name}」`, 'success');
    } catch (err) {
      showToast(`重命名失败: ${(err as Error).message}`, 'error');
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (category.is_default) return;
    try {
      await categoriesApi.delete(category.id);
      onCategoryChanged();
      showToast(`分类「${category.name}」已删除`, 'success');
    } catch (err) {
      showToast(`删除失败: ${(err as Error).message}`, 'error');
    }
  };

  return (
    <div>
      <div
        className="group flex items-center px-4 py-2 cursor-pointer hover:bg-[var(--color-bg-tertiary)] text-sm font-medium transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <svg className={clsx('w-3 h-3 mr-1 transition-transform flex-shrink-0', expanded && 'rotate-90')} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        {editing ? (
          <input
            type="text"
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setEditName(category.name); } }}
            onClick={e => e.stopPropagation()}
            className="flex-1 min-w-0 px-1 py-0.5 text-sm bg-[var(--color-bg)] border border-[var(--color-accent)] rounded outline-none"
            autoFocus
          />
        ) : (
          <span className="flex-1 truncate">{category.name}</span>
        )}
        {category.id !== 0 && !editing && (
          <div className="hidden group-hover:flex items-center gap-0.5 ml-1" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => { setEditing(true); setEditName(category.name); }}
              className="p-0.5 rounded hover:bg-[var(--color-border)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text)]"
              title="重命名"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            </button>
            {!category.is_default && (
              <button
                onClick={handleDelete}
                className="p-0.5 rounded hover:bg-red-100 text-[var(--color-text-tertiary)] hover:text-red-500"
                title="删除分类"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
        )}
      </div>
      {expanded && feeds.map(feed => (
        <FeedItem
          key={feed.id}
          feed={feed}
          isSelected={selectedFeedId === feed.id}
          onSelect={() => onSelectFeed(feed.id)}
          onFetch={() => onFetchFeed(feed.id)}
        />
      ))}
    </div>
  );
}

function FeedItem({ feed, isSelected, onSelect, onFetch }: {
  feed: Feed;
  isSelected: boolean;
  onSelect: () => void;
  onFetch: () => void;
}) {
  return (
    <div
      className={clsx(
        'group flex items-center pl-10 pr-2 py-1.5 cursor-pointer hover:bg-[var(--color-bg-tertiary)] transition-colors',
        isSelected && 'bg-[var(--color-accent-light)]'
      )}
      onClick={onSelect}
    >
      {feed.favicon_url ? (
        <img src={feed.favicon_url} alt="" className="w-4 h-4 mr-2 rounded" />
      ) : (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
      )}
      <span className="flex-1 text-sm truncate">{feed.name}</span>
      {feed.status !== 'healthy' && (
        <svg className="w-3 h-3 ml-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
      )}
      <FeedActionMenu feed={feed} onRefresh={onFetch} />
    </div>
  );
}
