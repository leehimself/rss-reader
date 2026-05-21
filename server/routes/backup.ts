import { Router } from 'express';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { dbManager } from '../db.js';
import { BACKUP_DIR, DB_PATH } from '../config.js';
import { log } from '../logger.js';

const router = Router();

router.post('/create', (_req, res, next) => {
  try {
    const db = dbManager.getConnection();
    db.pragma('wal_checkpoint(RESTART)');

    mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}.db`);

    copyFileSync(DB_PATH, backupPath);

    if (existsSync(DB_PATH + '-wal')) {
      copyFileSync(DB_PATH + '-wal', backupPath + '-wal');
    }
    if (existsSync(DB_PATH + '-shm')) {
      copyFileSync(DB_PATH + '-shm', backupPath + '-shm');
    }

    log.info('backup_created', { path: backupPath });
    res.json({ path: backupPath });
  } catch (err) {
    next(err);
  }
});

router.post('/restore', (req, res, next) => {
  try {
    const { file } = req.body;
    if (!file) throw new Error('File is required');

    if (!existsSync(file)) throw new Error('Backup file not found');

    const db = dbManager.getConnection();
    db.pragma('wal_checkpoint(TRUNCATE)');

    copyFileSync(file, DB_PATH);

    if (existsSync(file + '-wal')) {
      copyFileSync(file + '-wal', DB_PATH + '-wal');
    } else {
      try { require('fs').unlinkSync(DB_PATH + '-wal'); } catch {}
    }
    if (existsSync(file + '-shm')) {
      copyFileSync(file + '-shm', DB_PATH + '-shm');
    } else {
      try { require('fs').unlinkSync(DB_PATH + '-shm'); } catch {}
    }

    log.info('backup_restored', { file });
    res.json({ success: true, requiresRestart: true });
  } catch (err) {
    next(err);
  }
});

router.get('/list', (_req, res, next) => {
  try {
    const { readdirSync, statSync } = require('fs');
    if (!existsSync(BACKUP_DIR)) {
      res.json([]);
      return;
    }
    const files = readdirSync(BACKUP_DIR)
      .filter((f: string) => f.endsWith('.db'))
      .map((f: string) => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        size: statSync(path.join(BACKUP_DIR, f)).size,
        modified: statSync(path.join(BACKUP_DIR, f)).mtime,
      }))
      .sort((a: any, b: any) => b.modified.getTime() - a.modified.getTime());
    res.json(files);
  } catch (err) {
    next(err);
  }
});

export { router as backupRouter };
