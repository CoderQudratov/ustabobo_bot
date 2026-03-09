"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-[var(--border)] ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-webapp space-y-3">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-4 w-20 mt-2" />
    </div>
  );
}
