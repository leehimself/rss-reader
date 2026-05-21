import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

export function useFilterSync() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filterUnread, filterStarred, sortBy, setFilterUnread, setFilterStarred, setSortBy } = useUIStore();
  const lastUrlRef = useRef('');

  useEffect(() => {
    setFilterUnread(searchParams.get('unread') === '1');
    setFilterStarred(searchParams.get('starred') === '1');
    const sort = searchParams.get('sort');
    if (sort === 'newest' || sort === 'oldest') setSortBy(sort);
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('unread', filterUnread ? '1' : '0');
      next.set('starred', filterStarred ? '1' : '0');
      next.set('sort', sortBy);
      const fullUrl = next.toString();
      if (fullUrl === lastUrlRef.current) return prev;
      lastUrlRef.current = fullUrl;
      return next;
    }, { replace: true });
  }, [filterUnread, filterStarred, sortBy]);
}
