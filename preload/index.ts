import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getExpressPort: () => ipcRenderer.invoke('get-express-port'),
  getUIState: (name: string) => ipcRenderer.invoke('get-ui-state', name),
  setUIState: (name: string, value: string) => ipcRenderer.invoke('set-ui-state', name, value),
  removeUIState: (name: string) => ipcRenderer.invoke('remove-ui-state', name),
  requestNotificationPermission: () => ipcRenderer.invoke('request-notification-permission'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  exportPDF: (html: string) => ipcRenderer.invoke('export-pdf', html),
  setOpenAtLogin: (open: boolean) => ipcRenderer.invoke('open-at-login', open),
  showContextMenu: (params: { x: number; y: number; linkURL?: string; selectionText?: string }) =>
    ipcRenderer.invoke('show-context-menu', params),
  onDeepLink: (callback: (url: string) => void) => {
    ipcRenderer.on('deep-link', (_event, url) => callback(url));
  },
  onSettingUpdated: (callback: (key: string, value: any) => void) => {
    ipcRenderer.on('setting-updated', (_event, key, value) => callback(key, value));
  },
  platform: process.platform,
});
