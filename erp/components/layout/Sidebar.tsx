'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  Wrench,
  Package,
  BarChart3,
  Car,
  UserSearch,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { logout } from '@/lib/auth';

const MENU_GROUPS = [
  {
    title: 'ASOSIY',
    items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'BOSHQARUV',
    items: [
      { href: '/orders', label: 'Buyurtmalar', icon: ClipboardList },
      { href: '/organizations', label: 'Tashkilotlar', icon: Building2 },
      { href: '/users', label: 'Xodimlar', icon: Users },
    ],
  },
  {
    title: 'KATALOG',
    items: [
      { href: '/services', label: 'Xizmatlar', icon: Wrench },
      { href: '/products', label: 'Ombor (Zapchast)', icon: Package },
    ],
  },
  {
    title: 'TAHLIL',
    items: [
      { href: '/reports', label: 'Hisobotlar', icon: BarChart3 },
      { href: '/client-history', label: 'Mijoz tarixi', icon: UserSearch },
      { href: '/vehicle-history', label: 'Mashina tarixi', icon: Car },
    ],
  },
];

function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {MENU_GROUPS.map((group) => (
        <div key={group.title} className="mt-4 first:mt-0">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
            {group.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onLinkClick}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius)] px-4 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--accent-light)] font-semibold text-[var(--accent)]'
                      : 'font-medium text-[var(--text-2)] hover:bg-[var(--bg-3)]'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--accent)]' : 'text-[var(--text-3)]')} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { login: null }))
      .then((d) => setLogin(d.login ?? null))
      .catch(() => setLogin(null));
  }, []);

  const initials = login ? login.slice(0, 2).toUpperCase() : 'BP';

  return (
    <>
      {/* Desktop — to'liq balandlik */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-2)] md:flex">
        <div className="flex h-full flex-col p-4">
          <div className="shrink-0 px-2 pb-4">
            <div className="text-xl font-bold text-[var(--accent)]">
              ⚙ AVTO PRO
            </div>
            <div className="mt-0.5 text-xs text-[var(--text-3)]">ERP tizimi</div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavLinks />
          </div>
          <div className="mt-4 shrink-0 space-y-2 border-t border-[var(--border)] pt-4">
            <div className="flex items-center gap-3 rounded-[var(--radius)] px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-light)] font-mono text-xs font-semibold text-[var(--accent)]">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--text-1)]">
                  {login ?? 'Boss'}
                </p>
                <p className="text-xs text-[var(--text-3)]">Administrator</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-[var(--text-2)] hover:bg-[var(--bg-3)]"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </div>
      </aside>
      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden border-[var(--border)] bg-[var(--bg)] text-[var(--text-1)] hover:bg-[var(--bg-2)]"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-64 border-[var(--border)] bg-[var(--bg)] p-4"
        >
          <div className="mb-4 text-lg font-bold text-[var(--accent)]">
            ⚙ AVTO PRO
          </div>
          <NavLinks onLinkClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
