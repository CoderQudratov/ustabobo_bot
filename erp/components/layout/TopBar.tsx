'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Moon, Sun } from 'lucide-react';
import { logout } from '@/lib/auth';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/orders': 'Buyurtmalar',
  '/users': 'Xodimlar',
  '/organizations': 'Tashkilotlar',
  '/services': 'Xizmatlar',
  '/products': 'Ombor (Zapchast)',
  '/reports': 'Hisobotlar',
  '/client-history': 'Mijoz tarixi',
  '/vehicle-history': 'Mashina tarixi',
};

function getPageTitle(pathname: string): string {
  if (pathname in PAGE_TITLES) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/organizations/')) return 'Tashkilot';
  return 'ERP';
}

export function TopBar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { login: null }))
      .then((d) => setLogin(d.login ?? null))
      .catch(() => setLogin(null));
  }, []);

  const title = getPageTitle(pathname);
  const initials = login ? login.slice(0, 2).toUpperCase() : 'BP';

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)] px-4 md:px-6">
      <h1 className="text-xl font-bold text-[var(--text-1)]">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-[10px] font-medium text-white">
            0
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-[34px] w-[34px] rounded-full text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
          aria-label={(theme ?? 'dark') === 'dark' ? "Kun rejimiga o'tish" : "Tun rejimiga o'tish"}
          onClick={() => setTheme((theme ?? 'dark') === 'dark' ? 'light' : 'dark')}
        >
          {(theme ?? 'dark') === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] font-mono text-xs font-semibold text-[var(--accent)]">
          {initials}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-2 text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] sm:inline-flex"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </Button>
      </div>
    </header>
  );
}
