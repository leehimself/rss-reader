-- Migration 001: Initial schema

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
