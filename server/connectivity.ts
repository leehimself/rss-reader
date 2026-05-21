import { fetch as undiciFetch } from 'undici';

const ENDPOINTS = [
  'https://www.google.com/generate_204',
  'https://www.baidu.com',
  'https://1.1.1.1',
];

export async function checkConnectivity(): Promise<boolean> {
  for (const endpoint of ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const response = await undiciFetch(endpoint, {
        signal: controller.signal,
        method: 'HEAD',
      });
      clearTimeout(timeout);
      if (response.ok) return true;
    } catch {
      continue;
    }
  }
  return false;
}
