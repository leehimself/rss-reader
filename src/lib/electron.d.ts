export interface ElectronAPI {
  getExpressPort: () => Promise<number>;
  getUIState: (name: string) => Promise<string | null>;
  setUIState: (name: string, value: string) => Promise<void>;
  removeUIState: (name: string) => Promise<void>;
  requestNotificationPermission: () => Promise<boolean>;
  showNotification: (title: string, body: string) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  exportPDF: (html: string) => Promise<void>;
  setOpenAtLogin: (open: boolean) => Promise<void>;
  showContextMenu: (params: { x: number; y: number; linkURL?: string; selectionText?: string }) => Promise<void>;
  onDeepLink: (callback: (url: string) => void) => void;
  onSettingUpdated: (callback: (key: string, value: any) => void) => void;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }

  interface ImportMetaEnv {
    readonly DEV: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
