import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useArticleStore } from '../store/articleStore';
import { useFeedStore } from '../store/feedStore';
import { articlesApi } from '../lib/api';
import clsx from 'clsx';

export default function FilterBar() {
  const { filterStarred, sortBy, setFilterStarred, setSortBy } = useUIStore();
  const { refreshAll } = useFeedStore();
  const [refreshing, setRefreshing] = useState(false);
  const [caching, setCaching] = useState(false);

  const handleRefreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshAll();
      const { fetchArticles } = useArticleStore.getState();
      const { selectedFeedId } = useFeedStore.getState();
      const { filterStarred, sortBy, searchQuery } = useUIStore.getState();
      fetchArticles({ feed_id: selectedFeedId, fts: searchQuery || undefined, sort: sortBy, starred_only: filterStarred, page: 1, limit: 20 });
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePrecache = async () => {
    if (caching) return;
    setCaching(true);
    try {
      const result = await articlesApi.precacheAll();
      console.log(`缓存任务: ${result.total} 张图片`);
    } catch (err) {
      console.error('缓存失败:', err);
    } finally {
      setCaching(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        className={clsx('px-3 py-1.5 text-sm rounded-md transition-colors', filterStarred ? 'bg-[var(--color-accent)] text-white' : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]')}
        onClick={() => setFilterStarred(!filterStarred)}
      >
        收藏
      </button>
      <select
        value={sortBy}
        onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')}
        className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        <option value="newest">最新在前</option>
        <option value="oldest">最旧在前</option>
      </select>

      <div className="flex-1" />

      <button 
        onClick={handlePrecache}
        disabled={caching}
        className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
        title="缓存全部图片供离线查看"
      >
        {caching ? '缓存中...' : '预缓存'}
      </button>
      <button 
        onClick={handleRefreshAll} 
        disabled={refreshing}
        className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
      >
        {refreshing ? '刷新中...' : '全部刷新'}
      </button>
    </div>
  );
}