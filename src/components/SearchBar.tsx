import { useState, useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useArticleStore } from '../store/articleStore';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const { setSearchQuery } = useUIStore();
  const { fetchArticles } = useArticleStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      fetchArticles({
        fts: query || undefined,
        sort: useUIStore.getState().sortBy,
        starred_only: useUIStore.getState().filterStarred,
        page: 1,
        limit: 20,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex items-center gap-1 px-2.5 py-1 border border-[var(--color-border)] rounded-md bg-[var(--color-bg)] focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_2px_var(--color-accent-light)] transition-all duration-150">
      <svg className="w-3.5 h-3.5 flex-shrink-0 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="搜索"
        className="flex-1 py-1 text-sm bg-transparent border-none outline-none text-[var(--color-text)] placeholder-[var(--color-text-tertiary)]"
      />
      {query && (
        <button
          onClick={() => { setQuery(''); setSearchQuery(''); fetchArticles({ fts: undefined, sort: useUIStore.getState().sortBy, starred_only: useUIStore.getState().filterStarred, page: 1, limit: 20 }); }}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text)] rounded-full"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}