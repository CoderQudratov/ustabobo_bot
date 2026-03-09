"use client";

import Link from "next/link";

type Props = {
  title: string;
  backHref?: string;
  right?: React.ReactNode;
};

export function PageHeader({ title, backHref = "/", right }: Props) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)]/95 px-4 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-[var(--text-2)] hover:bg-black/5 hover:text-[var(--text)]"
            aria-label="Orqaga"
          >
            <span className="text-lg">←</span>
          </Link>
        )}
        <h1 className="truncate text-lg font-semibold text-[var(--text)]">
          {title}
        </h1>
      </div>
      {right != null && (
        <div className="flex shrink-0 items-center">{right}</div>
      )}
    </header>
  );
}
