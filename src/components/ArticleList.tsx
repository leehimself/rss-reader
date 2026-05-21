import type { Article } from '@shared/types';
import { useNavigate } from 'react-router-dom';
import { useArticleStore } from '../store/articleStore';
import { useUIStore } from '../store/uiStore';
import clsx from 'clsx';

export default function ArticleList() {
  const navigate = useNavigate();
  const { articles, selectedArticle, selectArticle, markRead } = useArticleStore();
  const { setSelectedArticleIndex } = useUIStore();

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
        <p className="text-lg">暂无文章</p>
        <p className="text-sm">选择一个订阅源或刷新以加载文章</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id}
          article={article}
          isSelected={selectedArticle?.id === article.id}
          isRead={article.is_read === 1}
          onClick={() => {
            selectArticle(article);
            setSelectedArticleIndex(index);
            if (!article.is_read) markRead(article.id);
            navigate(`/article/${article.id}`);
          }}
        />
      ))}
    </div>
  );
}

function ArticleCard({ article, isSelected, isRead, onClick }: {
  article: Article;
  isSelected: boolean;
  isRead: boolean;
  onClick: () => void;
}) {
  const timeAgo = getTimeAgo(article.published_at);

  return (
    <div
      className={clsx(
        'p-4 border-b border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-bg-secondary)] transition-colors',
        isSelected && 'bg-[var(--color-bg-secondary)]'
      )}
      onClick={onClick}
    >
      {!isRead && <div className="w-2 h-2 mt-2 rounded-full bg-[var(--color-accent)] flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
          {article.title}
        </h3>
        <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
          {article.content_plain || article.summary}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-text-secondary)]">
          <span>{article.author || '未知作者'}</span>
          <span>·</span>
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return '未知时间';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString();
}