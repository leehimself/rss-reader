export default function LoadingSkeleton() {
  return (
    <div className="flex h-screen w-screen bg-[var(--color-bg)]">
      <div className="w-60 border-r border-[var(--color-divider)] bg-[var(--color-bg-secondary)] p-3 space-y-2.5">
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-7 w-full" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton h-4 w-full" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="skeleton h-16 w-full" style={{ animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}
