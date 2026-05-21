export default function ImportProgressBar({ current, total, status }: {
  current: number;
  total: number;
  status: string;
}) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg p-4 shadow-lg w-80">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{status}</span>
        <span className="text-sm text-[var(--color-text-secondary)]">{current}/{total}</span>
      </div>
      <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
