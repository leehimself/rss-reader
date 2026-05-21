import { Router } from 'express';
import { getProxyAgent } from '../proxy.js';
import { fetch as undiciFetch } from 'undici';

const router = Router();

router.get('/video/:vid', async (req, res, next) => {
  try {
    const { vid } = req.params;
    const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${vid}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await undiciFetch(apiUrl, {
        signal: controller.signal,
        dispatcher: getProxyAgent() || undefined,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0' },
      });

      if (!response.ok) {
        res.status(502).json({ error: 'CCTV API unavailable' });
        return;
      }

      const data = await response.json() as any;
      if (data.hls_url) {
        res.json({ hls_url: data.hls_url, title: data.title, image: data.image });
      } else {
        res.status(404).json({ error: 'Video not found' });
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    next(err);
  }
});

export { router as cctvRouter };
