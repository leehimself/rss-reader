import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSettingsStore } from './store/settingsStore';
import { useFeedStore } from './store/feedStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import FeedPage from './pages/FeedPage';
import ArticlePage from './pages/ArticlePage';
import LoadingSkeleton from './components/LoadingSkeleton';
import Sidebar from './components/Sidebar';

export default function App() {
  const { fetchSettings } = useSettingsStore();
  const { fetchFeeds } = useFeedStore();
  const [hasHydrated, setHasHydrated] = useState(false);
  useTheme();
  useKeyboardShortcuts();

  useEffect(() => {
    fetchSettings();
    fetchFeeds();
    const unsub = useSettingsStore.persist.onFinishHydration?.(() => setHasHydrated(true));
    setHasHydrated(true);
    return () => unsub?.();
  }, []);

  if (!hasHydrated) {
    return <LoadingSkeleton />;
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)]">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<FeedPage />} />
            <Route path="/article/:id" element={<ArticlePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
