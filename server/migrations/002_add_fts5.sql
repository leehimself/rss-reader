-- Migration 002: Add FTS5 full-text search

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
