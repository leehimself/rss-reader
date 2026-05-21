import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';
import { useArticleStore } from '../store/articleStore';

export function useKeyboardShortcuts() {
  const { selectedArticleIndex, setSelectedArticleIndex } = useUIStore();
  const { articles, selectedArticle, selectArticle, markRead, markStar, markUnstar } = useArticleStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          if (selectedArticleIndex < articles.length - 1) {
            const nextIdx = selectedArticleIndex + 1;
            setSelectedArticleIndex(nextIdx);
            selectArticle(articles[nextIdx]);
          }
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          if (selectedArticleIndex > 0) {
            const prevIdx = selectedArticleIndex - 1;
            setSelectedArticleIndex(prevIdx);
            selectArticle(articles[prevIdx]);
          }
          break;
        case 'm':
          e.preventDefault();
          if (selectedArticle) {
            markRead(selectedArticle.id);
          }
          break;
        case 's':
          e.preventDefault();
          if (selectedArticle) {
            if (selectedArticle.is_starred) markUnstar(selectedArticle.id);
            else markStar(selectedArticle.id);
          }
          break;
        case 'r':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            window.location.reload();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArticleIndex, articles, selectedArticle, selectArticle, markRead, markStar, markUnstar, setSelectedArticleIndex]);
}
