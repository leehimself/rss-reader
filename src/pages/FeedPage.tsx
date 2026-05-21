import { useEffect } from 'react';
import { useFeedStore } from '../store/feedStore';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import { useFilterSync } from '../hooks/useFilterSync';
import ArticleList from '../components/ArticleList';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function FeedPage() {
  const { feeds, selectedFeedId, loading: feedsLoading } = useFeedStore();
  const { articles, total, page, limit, loading: articlesLoading, fetchArticles } = useArticleStore();
  const { filterStarred, sortBy, searchQuery } = useUIStore();

  useFilterSync();

  useEffect(() => {
    fetchArticles({
      feed_id: selectedFeedId,
      fts: searchQuery || undefined,
      sort: sortBy,
      starred_only: filterStarred,
      page,
      limit,
    });
  }, [selectedFeedId, filterStarred, sortBy, searchQuery, page, limit]);

  if (feedsLoading) return <LoadingSkeleton />;
  if (feeds.length === 0 && !selectedFeedId) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)' }}>欢迎使用 RSS 阅读器</h2>
        <p className="text-[var(--color-text-secondary)]">添加你的第一个订阅源开始使用</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <FilterBar />
      <div className="flex-1 overflow-y-auto">
        <ArticleList />
        {articlesLoading && articles.length > 0 && (
          <div className="flex justify-center py-2">
            <div className="w-4 h-4 border-2 border-[var(--color-accent)]/20 border-t-[var(--color-accent)] rounded-full animate-spin" />
          </div>
        )}
      </div>
      <Pagination page={page} total={total} limit={limit} onPageChange={(p) => {
        useUIStore.getState().setSelectedArticleIndex(0);
        useArticleStore.getState().fetchArticles({
          feed_id: selectedFeedId,
          fts: searchQuery || undefined,
          sort: sortBy,
          starred_only: filterStarred,
          page: p,
          limit,
        });
      }} />
    </div>
  );
}
