import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  searchQuery: string;
  activeDialog: string | null;
  selectedArticleIndex: number;
  filterUnread: boolean;
  filterStarred: boolean;
  sortBy: 'newest' | 'oldest';
  fontSize: number;
  setSidebarCollapsed: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  setActiveDialog: (v: string | null) => void;
  setSelectedArticleIndex: (v: number) => void;
  setFilterUnread: (v: boolean) => void;
  setFilterStarred: (v: boolean) => void;
  setSortBy: (v: 'newest' | 'oldest') => void;
  setFontSize: (v: number) => void;
}

const ipcStorage = {
  getItem: async (name: string) => {
    try {
      const value = await window.electronAPI.getUIState(name);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: any) => {
    try {
      await window.electronAPI.setUIState(name, JSON.stringify(value));
    } catch {}
  },
  removeItem: async (name: string) => {
    try {
      await window.electronAPI.removeUIState(name);
    } catch {}
  },
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      searchQuery: '',
      activeDialog: null,
      selectedArticleIndex: 0,
      filterUnread: false,
      filterStarred: false,
      sortBy: 'newest',
      fontSize: 1,

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      setSearchQuery: (v) => set({ searchQuery: v }),
      setActiveDialog: (v) => set({ activeDialog: v }),
      setSelectedArticleIndex: (v) => set({ selectedArticleIndex: v }),
      setFilterUnread: (v) => set({ filterUnread: v }),
      setFilterStarred: (v) => set({ filterStarred: v }),
      setSortBy: (v) => set({ sortBy: v }),
      setFontSize: (v) => set({ fontSize: v }),
    }),
    {
      name: 'ui-state',
      storage: ipcStorage,
    }
  )
);
