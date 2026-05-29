import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { opmlApi, backupApi } from '../lib/api';

interface SettingsDialogProps {
  onClose: () => void;
}

export default function SettingsDialog({ onClose }: SettingsDialogProps) {
  const settings = useSettingsStore();
  const [opmlFile, setOpmlFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState('');

  const handleExportOPML = async () => {
    try {
      const xml = await opmlApi.export();
      const blob = new Blob([xml], { type: 'text/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rss-reader-export.opml';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败：' + (err as Error).message);
    }
  };

  const handleImportOPML = async () => {
    if (!opmlFile) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const { taskId } = await opmlApi.import(content, 'skip');
        setImportStatus('导入中...');
        const poll = setInterval(async () => {
          const task = await opmlApi.getTask(taskId);
          if (task.status === 'done' || task.status === 'error') {
            clearInterval(poll);
            setImportStatus(`已导入：${task.imported}，跳过：${task.skipped}`);
          }
        }, 500);
      } catch (err) {
        setImportStatus('导入失败：' + (err as Error).message);
      }
    };
    reader.readAsText(opmlFile);
  };

  const handleBackup = async () => {
    try {
      const result = await backupApi.create();
      alert(`备份已创建：${result.path}`);
    } catch (err) {
      alert('备份失败：' + (err as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--color-bg)] rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">设置</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">主题</label>
            <select
              value={settings.theme}
              onChange={e => settings.updateSetting('theme', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
            >
              <option value="system">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">刷新间隔（分钟）</label>
            <input
              type="number"
              value={settings.refresh_interval}
              onChange={e => settings.updateSetting('refresh_interval', Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
              min={1}
              max={1440}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">保留天数</label>
            <input
              type="number"
              value={settings.max_keep_days}
              onChange={e => settings.updateSetting('max_keep_days', Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">每个订阅源最多文章数</label>
            <input
              type="number"
              value={settings.max_articles_per_feed}
              onChange={e => settings.updateSetting('max_articles_per_feed', Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
              min={10}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.enable_notifications}
              onChange={e => settings.updateSetting('enable_notifications', e.target.checked)}
              id="notifications"
            />
            <label htmlFor="notifications" className="text-sm">启用通知</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.open_at_login}
              onChange={e => {
                settings.updateSetting('open_at_login', e.target.checked);
                window.electronAPI.setOpenAtLogin(e.target.checked);
              }}
              id="openAtLogin"
            />
            <label htmlFor="openAtLogin" className="text-sm">开机自启动</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.minimize_to_tray}
              onChange={e => settings.updateSetting('minimize_to_tray', e.target.checked)}
              id="minimizeToTray"
            />
            <label htmlFor="minimizeToTray" className="text-sm">最小化到托盘</label>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-medium mb-3">AI 智能功能</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">API Key</label>
                <input
                  type="password"
                  value={settings.ai_api_key}
                  onChange={e => settings.updateSetting('ai_api_key', e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">模型</label>
                <input
                  type="text"
                  value={settings.ai_model}
                  onChange={e => settings.updateSetting('ai_model', e.target.value)}
                  placeholder="deepseek-v4-flash"
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">摘要语言</label>
                <select
                  value={settings.ai_summary_language}
                  onChange={e => settings.updateSetting('ai_summary_language', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded bg-[var(--color-bg)] text-[var(--color-text)]"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-medium mb-2">OPML 导入/导出</h3>
            <div className="flex gap-2">
              <button onClick={handleExportOPML} className="px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
                导出
              </button>
              <input type="file" accept=".opml,.xml" onChange={e => setOpmlFile(e.target.files?.[0] || null)} className="text-sm" />
              <button onClick={handleImportOPML} disabled={!opmlFile} className="px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50">
                导入
              </button>
            </div>
            {importStatus && <p className="text-sm mt-1 text-[var(--color-text-secondary)]">{importStatus}</p>}
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <h3 className="text-sm font-medium mb-2">备份</h3>
            <button onClick={handleBackup} className="px-3 py-2 text-sm rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
              创建备份
            </button>
          </div>

          <div className="pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={() => { settings.resetSettings(); }}
              className="px-3 py-2 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-border)]"
            >
              恢复默认设置
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}