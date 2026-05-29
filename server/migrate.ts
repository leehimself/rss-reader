import { dbManager } from './db.js';
import { log } from './logger.js';

interface Migration {
  version: number;
  name: string;
  sql: string;
  ignoreError?: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_initial.sql',
    sql: `
CREATE TABLE IF NOT EXISTS db_migrations (
  version    INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('refresh_interval', '30');
INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');
INSERT OR IGNORE INTO settings (key, value) VALUES ('max_keep_days', '90');
INSERT OR IGNORE INTO settings (key, value) VALUES ('max_articles_per_feed', '500');
INSERT OR IGNORE INTO settings (key, value) VALUES ('enable_notifications', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('open_at_login', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('minimize_to_tray', 'true');
INSERT OR IGNORE INTO settings (key, value) VALUES ('log_level', 'info');

CREATE TABLE IF NOT EXISTS categories (
  id         INTEGER PRIMARY KEY NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_default INTEGER DEFAULT 0
) WITHOUT ROWID;

INSERT OR IGNORE INTO categories (id, name, sort_order, is_default) VALUES (0, 'Uncategorized', 0, 1);

CREATE TABLE IF NOT EXISTS feeds (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  url              TEXT NOT NULL,
  url_hash         TEXT UNIQUE NOT NULL,
  category_id      INTEGER DEFAULT 0 REFERENCES categories(id) ON DELETE SET DEFAULT,
  favicon_url      TEXT,
  description      TEXT,
  custom_interval  INTEGER,
  status           TEXT DEFAULT 'healthy',
  last_error       TEXT,
  error_count      INTEGER DEFAULT 0,
  next_retry_at    DATETIME,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS articles (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_id         INTEGER NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  link            TEXT NOT NULL,
  link_hash       TEXT NOT NULL,
  summary         TEXT,
  content         TEXT,
  content_plain   TEXT,
  author          TEXT,
  published_at    DATETIME,
  fetched_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_read         INTEGER DEFAULT 0,
  read_at         DATETIME,
  is_starred      INTEGER DEFAULT 0,
  starred_at      DATETIME,
  scroll_position INTEGER DEFAULT 0,
  UNIQUE(feed_id, link_hash)
);

CREATE INDEX IF NOT EXISTS idx_articles_feed ON articles(feed_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_unread ON articles(is_read, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_starred ON articles(is_starred, starred_at DESC);
CREATE INDEX IF NOT EXISTS idx_feeds_category ON feeds(category_id);
CREATE INDEX IF NOT EXISTS idx_feeds_status ON feeds(status);
`,
  },
  {
    version: 2,
    name: '002_add_fts5.sql',
    sql: `
CREATE VIRTUAL TABLE IF NOT EXISTS articles_fts USING fts5(
  title, summary, content_plain,
  content='articles',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS articles_fts_insert AFTER INSERT ON articles BEGIN
  INSERT INTO articles_fts(rowid, title, summary, content_plain)
  VALUES (new.id, new.title, new.summary, new.content_plain);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_delete AFTER DELETE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_plain)
  VALUES ('delete', old.id, old.title, old.summary, old.content_plain);
END;

CREATE TRIGGER IF NOT EXISTS articles_fts_update AFTER UPDATE ON articles BEGIN
  INSERT INTO articles_fts(articles_fts, rowid, title, summary, content_plain)
  VALUES ('delete', old.id, old.title, old.summary, old.content_plain);
  INSERT INTO articles_fts(rowid, title, summary, content_plain)
  VALUES (new.id, new.title, new.summary, new.content_plain);
END;
`,
  },
  {
    version: 3,
    name: '003_add_favicon.sql',
    sql: `ALTER TABLE feeds ADD COLUMN favicon_url TEXT;`,
    ignoreError: 'duplicate column name',
  },
  {
    version: 4,
    name: '004_add_starred.sql',
    sql: `
ALTER TABLE articles ADD COLUMN is_starred INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN starred_at DATETIME;
`,
    ignoreError: 'duplicate column name',
  },
  {
    version: 5,
    name: '005_add_ai_summaries.sql',
    sql: `
CREATE TABLE IF NOT EXISTS article_summaries (
  article_id  INTEGER PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  model       TEXT NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
`,
  },
  {
    version: 6,
    name: '006_category_name_zh.sql',
    sql: `UPDATE categories SET name = '未分类' WHERE id = 0 AND name = 'Uncategorized';`,
    ignoreError: 'no such table',
  },
];

export async function runMigrations(): Promise<void> {
  const db = dbManager.getConnection();

  db.exec(`
    CREATE TABLE IF NOT EXISTS db_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = db.prepare('SELECT version FROM db_migrations').all() as { version: number }[];
  const appliedVersions = new Set(applied.map(r => r.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;

    log.info('migration', { version: migration.version, name: migration.name });

    try {
      db.exec(migration.sql);
      db.prepare('INSERT INTO db_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
      log.info('migration_applied', { version: migration.version, name: migration.name });
    } catch (err) {
      const msg = (err as Error).message;
      if (migration.ignoreError && msg.includes(migration.ignoreError)) {
        db.prepare('INSERT INTO db_migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
        log.info('migration_skipped', { version: migration.version, name: migration.name, reason: migration.ignoreError });
      } else {
        log.error('migration_failed', { version: migration.version, name: migration.name, error: msg });
        throw err;
      }
    }
  }
}
