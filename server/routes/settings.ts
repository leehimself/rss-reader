import { Router } from 'express';
import { settingsService } from '../settings-service.js';

const router = Router();

router.get('/', async (_req, res) => {
  const settings = await settingsService.getAll();
  res.json(settings);
});

router.put('/', async (req, res, next) => {
  try {
    const { key, value } = req.body;
    if (key && value !== undefined) {
      await settingsService.set(key, value);
    } else {
      for (const [k, v] of Object.entries(req.body)) {
        await settingsService.set(k, v as string | number | boolean);
      }
    }
    const settings = await settingsService.getAll();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

router.post('/reset', async (_req, res, next) => {
  try {
    await settingsService.reset();
    const settings = await settingsService.getAll();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

export { router as settingsRouter };
