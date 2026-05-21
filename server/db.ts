import Database from 'better-sqlite3';
import { log } from './logger.js';

export class DatabaseManager {
  private db: Database.Database | null = null;

  getConnection(): Database.Database {
    if (!this.db || !this.isConnected()) {
      throw new Error('Database connection not initialized');
    }
    return this.db;
  }

  isConnected(): boolean {
    if (!this.db) return false;
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  prepare(sql: string): ReturnType<Database.Database['prepare']> {
    const stmt = this.db!.prepare(sql);
    return new Proxy(stmt, {
      get: (target, prop) => {
        if (prop === 'run') return (...args: any[]) => this._track(sql, () => (target.run as any)(...args));
        if (prop === 'get') return (...args: any[]) => this._track(sql, () => (target.get as any)(...args));
        if (prop === 'all') return (...args: any[]) => this._track(sql, () => (target.all as any)(...args));
        const value = (target as any)[prop];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as any;
  }

  private _track<T>(sql: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    if (duration > 100) {
      log.warn('slow_query', { sql: sql.slice(0, 100), duration: `${duration.toFixed(1)}ms` });
    }
    return result;
  }

  init(dbPath: string): void {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
  }

  async gracefulShutdown(): Promise<void> {
    if (this.db) {
      this.db.pragma('wal_checkpoint(TRUNCATE)');
      this.db.close();
      this.db = null;
    }
  }
}

export const dbManager = new DatabaseManager();
