-- Migration 003: Add favicon_url column to feeds

ALTER TABLE feeds ADD COLUMN favicon_url TEXT;
