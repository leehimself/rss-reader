import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsApi } from '../lib/api';
import type { Settings } from '@shared/types';

interface SettingsStore extends Settings {
  loading: boolean;
  fontSize: number;
  fetchSettings: () => Promise<void>;
  updateSetting: (key: string, value: string | number | boolean) => Promise<void>;
  resetSettings: () => Promise<void>;
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

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      refresh_interval: 30,
      theme: 'system',
      max_keep_days: 90,
      max_articles_per_feed: 500,
      enable_notifications: true,
      open_at_login: false,
      minimize_to_tray: true,
      log_level: 'info',
      ai_api_key: '',
      ai_model: 'deepseek-v4-flash',
      ai_summary_language: 'zh',
      loading: false,
      fontSize: 1,

      fetchSettings: async () => {
        set({ loading: true });
        try {
          const settings = await settingsApi.getAll();
          set({ ...settings, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      updateSetting: async (key, value) => {
        await settingsApi.update({ [key]: value });
        set({ [key]: value } as any);
      },

      resetSettings: async () => {
        const settings = await settingsApi.reset();
        set(settings);
      },
    }),
    {
      name: 'settings-state',
      storage: ipcStorage,
    }
  )
);
