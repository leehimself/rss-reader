import { useSettingsStore } from '../store/settingsStore';

export default function ThemeToggle() {
  const { theme, updateSetting } = useSettingsStore();

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    updateSetting('theme', next);
  };

  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻';

  return (
    <button onClick={toggle} className="p-1 rounded hover:bg-[var(--color-border)]" title={`主题：${theme}`}>
      {icon}
    </button>
  );
}