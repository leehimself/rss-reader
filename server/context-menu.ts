import { ipcMain, Menu, BrowserWindow, shell } from 'electron';

export function setupContextMenu() {
  ipcMain.handle('show-context-menu', (_event, params: { x: number; y: number; linkURL?: string; selectionText?: string }) => {
    const menuItems: Electron.MenuItemConstructorOptions[] = [];

    if (params.selectionText) {
      menuItems.push({ label: 'Copy', role: 'copy' });
    }

    if (params.linkURL) {
      menuItems.push({
        label: 'Open Link in Browser',
        click: () => {
          shell.openExternal(params.linkURL!);
        },
      });
    }

    menuItems.push({ type: 'separator' });
    menuItems.push({ label: 'Select All', role: 'selectAll' });

    const menu = Menu.buildFromTemplate(menuItems);
    menu.popup({ window: BrowserWindow.getFocusedWindow()! });
  });
}
