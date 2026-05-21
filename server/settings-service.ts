import { dbManager } from './db.js';

const TYPE_MAP: Record<string, 'number' | 'boolean' | 'string'> = {
  refresh_interval: 'number',
  theme: 'string',
  max_keep_days: 'number',
  max_articles_per_feed: 'number',
  enable_notifications: 'boolean',
  open_at_login: 'boolean',
  minimize_to_tray: 'boolean',
  log_level: 'string',
};

const DEFAULTS: Record<string, string> = {
  refresh_interval: '30',
  theme: 'system',
  max_keep_days: '90',
  max_articles_per_feed: '500',
  enable_notifications: 'true',
  open_at_login: 'false',
  minimize_to_tray: 'true',
  log_level: 'info',
};

function deserialize(key: string, value: string): string | number | boolean {
  const type = TYPE_MAP[key];
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === 'true';
  return value;
}

function serialize(_key: string, value: string | number | boolean): string {
  return String(value);
}

export class SettingsService {
  async getAll(): Promise<Record<string, string | number | boolean>> {
    const db = dbManager.getConnection();
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const result: Record<string, string | number | boolean> = {};
    for (const row of rows) {
      result[row.key] = deserialize(row.key, row.value);
    }
    return result;
  }

  async get(key: string): Promise<string | number | boolean | undefined> {
    const db = dbManager.getConnection();
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    if (!row) return undefined;
    return deserialize(key, row.value);
  }

  async set(key: string, value: string | number | boolean): Promise<void> {
    const db = dbManager.getConnection();
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, serialize(key, value));
  }

  async reset(): Promise<void> {
    const db = dbManager.getConnection();
    for (const [key, value] of Object.entries(DEFAULTS)) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
    }
  }
}

export const settingsService = new SettingsService();
