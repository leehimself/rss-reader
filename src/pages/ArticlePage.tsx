import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useArticleStore } from '../store/articleStore';
import { useSettingsStore } from '../store/settingsStore';
import { articlesApi } from '../lib/api';

const sanitizeConfig = {
  ADD_TAGS: ['iframe', 'video', 'source', 'embed'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'srcdoc', 'loading'],
};

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedArticle, markRead, markStar, markUnstar } = useArticleStore();
  const { fontSize } = useSettingsStore.getState();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;

    const articleId = parseInt(id);
    const article = useArticleStore.getState().articles.find(a => a.id === articleId);

    if (article) {
      useArticleStore.getState().selectArticle(article);
      if (!article.is_read) markRead(articleId);

      if (article.content && article.content.length > 200) {
        setContent(article.content);
      } else {
        enrichArticle(articleId);
      }
    }
  }, [id]);

  const enrichArticle = async (articleId: number) => {
    setLoading(true);
    try {
      const result = await articlesApi.enrich(articleId);
      setContent(result.content);
    } catch {
      setContent('<p>无法加载文章内容。</p>');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOriginal = () => {
    if (selectedArticle?.link) {
      window.electronAPI.openExternal(selectedArticle.link);
    }
  };

  const handleScroll = () => {
    if (selectedArticle && contentRef.current) {
      articlesApi.saveScroll(selectedArticle.id, contentRef.current.scrollTop);
    }
  };

  const fontSizeClass = fontSize === 0 ? 'text-base' : fontSize === 1 ? 'text-base' : fontSize === 2 ? 'text-lg' : 'text-xl';

  if (!selectedArticle) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
        选择一篇文章阅读
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
        <button onClick={() => navigate('/')} className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors">
          ← 返回
        </button>
        <div className="flex-1" />
        <button onClick={() => {}} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="减小字体">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
        <button onClick={() => {}} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="增大字体">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button
          onClick={() => selectedArticle.is_starred ? markUnstar(selectedArticle.id) : markStar(selectedArticle.id)}
          className={`p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors ${selectedArticle.is_starred ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-secondary)]'}`}
          title="收藏"
        >
          {selectedArticle.is_starred ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 3.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
          )}
        </button>
        <button onClick={handleOpenOriginal} className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] transition-colors" title="在浏览器中打开">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </button>
      </div>

      <div ref={contentRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto px-8 py-6 max-w-3xl mx-auto article-content ${fontSizeClass}`}>
        <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-serif)' }}>{selectedArticle.title}</h1>
        <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)] mb-8 pb-4 border-b border-[var(--color-border)]">
          {selectedArticle.author && <span>{selectedArticle.author}</span>}
          {selectedArticle.published_at && (
            <>
              <span className="text-[var(--color-border)]">|</span>
              <span>{new Date(selectedArticle.published_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </>
          )}
        </div>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-[var(--color-border)] rounded animate-pulse" />
            ))}
          </div>
        ) : content ? (
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content, sanitizeConfig) }} />
        ) : (
          <p className="text-[var(--color-text-secondary)]">{selectedArticle.summary || '暂无内容'}</p>
        )}
      </div>
    </div>
  );
}