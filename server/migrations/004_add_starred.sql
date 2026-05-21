-- Migration 004: Add starred column to articles

ALTER TABLE articles ADD COLUMN is_starred INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN starred_at DATETIME;
