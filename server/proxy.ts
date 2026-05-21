import { ProxyAgent } from 'undici';

let sharedProxyAgent: ProxyAgent | undefined;

export function initProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (proxyUrl) {
    sharedProxyAgent = new ProxyAgent(proxyUrl);
  }
}

export function getProxyAgent(): ProxyAgent | undefined {
  return sharedProxyAgent;
}

export { sharedProxyAgent };
