'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Bell, Moon } from 'lucide-react';
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
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-6">
      <h1 className="font-heading text-xl font-bold text-text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          aria-label="Bildirishnomalar"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
            0
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-text-secondary hover:bg-surface-2 hover:text-text-primary"
          aria-label="Tema"
        >
          <Moon className="h-5 w-5" />
        </Button>
        <div className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 font-mono text-xs font-semibold text-primary">
          {initials}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="hidden gap-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary sm:inline-flex"
          onClick={() => logout()}
        >
          <LogOut className="h-4 w-4" />
          Chiqish
        </Button>
      </div>
    </header>
  );
}
