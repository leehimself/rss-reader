import { parentPort } from 'worker_threads';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import pLimit from 'p-limit';

const imageFetchLimit = pLimit(5);

let proxyAgent: ProxyAgent | undefined;

parentPort?.on('message', async (msg: any) => {
  if (msg.type === 'init') {
    if (msg.proxyUrl) {
      proxyAgent = new ProxyAgent(msg.proxyUrl);
    }
    return;
  }

  if (msg.type === 'download') {
    try {
      const result = await imageFetchLimit(async () => downloadImage(msg.url, msg.referer));
      parentPort?.postMessage({
        msgId: msg.msgId,
        type: 'result',
        data: Array.from(result.data),
        contentType: result.contentType,
      });
    } catch (err) {
      parentPort?.postMessage({ msgId: msg.msgId, type: 'error', message: (err as Error).message });
    }
  }
});

async function downloadImage(url: string, referer?: string): Promise<{ data: Buffer; contentType: string }> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  };
  if (referer) headers['Referer'] = referer;

  const response = await undiciFetch(url, {
    dispatcher: proxyAgent,
    headers,
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length > 5 * 1024 * 1024) throw new Error('Image too large');

  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  return { data: buffer, contentType };
}
