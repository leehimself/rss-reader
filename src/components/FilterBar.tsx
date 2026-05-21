import { useState } from 'react';
import { useUIStore } from '../store/uiStore';
import { useArticleStore } from '../store/articleStore';
import { useFeedStore } from '../store/feedStore';
import clsx from 'clsx';

export default function FilterBar() {
  const { filterUnread, filterStarred, sortBy, setFilterUnread, setFilterStarred, setSortBy } = useUIStore();
  const { selectedIds, markReadBatch, clearSelection } = useArticleStore();
  const { selectedFeedId, refreshAll } = useFeedStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleMarkAllRead = async () => {
    const { markAllRead } = useArticleStore.getState();
    await markAllRead(selectedFeedId || undefined);
  };

  const handleRefreshAll = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await refreshAll();
      console.log(`刷新完成: ${result.success} 成功, ${result.failed} 失败, ${result.new_articles} 篇新文章`);
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
      <button
        className={clsx('px-3 py-1.5 text-sm rounded-md transition-colors', filterUnread ? 'bg-[var(--color-accent)] text-white' : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]')}
        onClick={() => setFilterUnread(!filterUnread)}
      >
        未读
      </button>
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">已选 {selectedIds.size} 篇</span>
          <button onClick={() => markReadBatch(Array.from(selectedIds))} className="px-3 py-1.5 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
            标记已读
          </button>
          <button onClick={clearSelection} className="px-3 py-1.5 text-sm rounded hover:bg-[var(--color-border)]">
            清除
          </button>
        </div>
      )}

      <button 
        onClick={handleRefreshAll} 
        disabled={refreshing}
        className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors disabled:opacity-50"
      >
        {refreshing ? '刷新中...' : '全部刷新'}
      </button>

      <button onClick={handleMarkAllRead} className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors">
        全部标记已读
      </button>
    </div>
  );
}