import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import { useArticleStore } from '../store/articleStore';
import { useSettingsStore } from '../store/settingsStore';
import { articlesApi } from '../lib/api';

const sanitizeConfig = {
  ADD_TAGS: ['iframe', 'video', 'source', 'embed'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'srcdoc', 'loading'],
  ADD_DATA_URI_TAGS: ['iframe'],
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

  const handleExportMarkdown = () => {
    if (!selectedArticle) return;
    const turndown = new TurndownService();
    const markdown = turndown.turndown(content || selectedArticle.summary || '');
    const blob = new Blob([`# ${selectedArticle.title}\n\n${markdown}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedArticle.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenOriginal = () => {
    if (selectedArticle?.link) {
      window.electronAPI.openExternal(selectedArticle.link);
    }
  };

  const handleExportPDF = async () => {
    if (content) {
      await window.electronAPI.exportPDF(content);
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
      <div className="flex items-center gap-2 p-4 border-b border-[var(--color-border)]">
        <button onClick={() => navigate('/')} className="px-3 py-1.5 text-sm rounded hover:bg-[var(--color-border)]">
          ← 返回
        </button>
        <div className="flex-1" />
        <button onClick={() => {}} className="px-2 py-1.5 rounded hover:bg-[var(--color-border)]" title="减小字体">A-</button>
        <button onClick={() => {}} className="px-2 py-1.5 rounded hover:bg-[var(--color-border)]" title="增大字体">A+</button>
        <button
          onClick={() => selectedArticle.is_starred ? markUnstar(selectedArticle.id) : markStar(selectedArticle.id)}
          className={`px-2 py-1.5 rounded hover:bg-[var(--color-border)] ${selectedArticle.is_starred ? 'text-yellow-500' : ''}`}
          title="收藏"
        >
          {selectedArticle.is_starred ? '★' : '☆'}
        </button>
        <button onClick={handleOpenOriginal} className="px-2 py-1.5 rounded hover:bg-[var(--color-border)]" title="在浏览器中打开">
          ↗
        </button>
        <button onClick={handleExportMarkdown} className="px-2 py-1.5 rounded hover:bg-[var(--color-border)]" title="导出为 Markdown">
          📄
        </button>
        <button onClick={handleExportPDF} className="px-2 py-1.5 rounded hover:bg-[var(--color-border)]" title="导出为 PDF">
          📋
        </button>
      </div>

      <div ref={contentRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto p-8 max-w-3xl mx-auto article-content ${fontSizeClass}`}>
        <h1 className="text-2xl font-bold mb-4">{selectedArticle.title}</h1>
        <div className="text-sm text-[var(--color-text-secondary)] mb-6">
          {selectedArticle.author && <span>{selectedArticle.author}</span>}
          {selectedArticle.published_at && <span> · {new Date(selectedArticle.published_at).toLocaleDateString()}</span>}
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