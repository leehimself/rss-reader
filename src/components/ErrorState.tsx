export default function ErrorState({ message = '发生错误', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-secondary)]">
      <svg className="w-16 h-16 mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p className="text-lg text-red-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-4 px-4 py-2 rounded bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]">
          重试
        </button>
      )}
    </div>
  );
}