import { useFeedStore } from '../store/feedStore';
import { useUIStore } from '../store/uiStore';
import { useNavigate } from 'react-router-dom';
import CategoryList from './CategoryList';
import FeedManageDialog from './FeedManageDialog';
import SettingsDialog from './SettingsDialog';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';
import clsx from 'clsx';

export default function Sidebar() {
  const { feeds, selectedFeedId, selectFeed } = useFeedStore();
  const { sidebarCollapsed, setSidebarCollapsed, setActiveDialog } = useUIStore();
  const navigate = useNavigate();

  const handleSelectFeed = (id: number | null) => {
    selectFeed(id);
    navigate('/');
  };

  return (
    <>
      <aside className={clsx(
        'flex flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all duration-200',
        sidebarCollapsed ? 'w-12' : 'w-64'
      )}>
        {sidebarCollapsed ? (
          <div className="flex h-full flex-col items-center py-4 gap-4">
            <button onClick={() => setSidebarCollapsed(false)} className="p-2 rounded hover:bg-[var(--color-border)]" title="展开侧边栏">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
              <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-serif)' }}>RSS 阅读器</h1>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button onClick={() => setSidebarCollapsed(true)} className="p-1 rounded hover:bg-[var(--color-border)]" title="收起侧边栏">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
              </div>
            </div>

            <div className="p-2">
              <SearchBar />
            </div>

            <div className="flex-1 overflow-y-auto">
              <CategoryList feeds={feeds} selectedFeedId={selectedFeedId} onSelectFeed={handleSelectFeed} />
            </div>

            <div className="flex gap-2 p-2 border-t border-[var(--color-border)]">
              <button
                onClick={() => setActiveDialog('add-feed')}
                className="flex-1 px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                + 添加订阅源
              </button>
              <button
                onClick={() => setActiveDialog('settings')}
                className="px-3 py-2 rounded hover:bg-[var(--color-border)]"
                title="设置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </button>
            </div>
          </>
        )}
      </aside>

      {useUIStore.getState().activeDialog === 'add-feed' && (
        <FeedManageDialog onClose={() => useUIStore.getState().setActiveDialog(null)} />
      )}
      {useUIStore.getState().activeDialog === 'settings' && (
        <SettingsDialog onClose={() => useUIStore.getState().setActiveDialog(null)} />
      )}
    </>
  );
}