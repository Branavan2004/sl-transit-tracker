// Provides a reusable animated skeleton block for loading placeholders.
export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--c-navy4)] ${className}`} />;
}
