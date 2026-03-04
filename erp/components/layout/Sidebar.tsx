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
  UserCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const items = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Buyurtmalar', icon: ClipboardList },
  { href: '/users', label: 'Xodimlar', icon: Users },
  { href: '/organizations', label: 'Tashkilotlar', icon: Building2 },
  { href: '/services', label: 'Xizmatlar', icon: Wrench },
  { href: '/products', label: 'Ombor (Zapchast)', icon: Package },
  { href: '/reports', label: 'Hisobotlar', icon: BarChart3 },
  { href: '/vehicle-history', label: 'Mashina tarixi', icon: Car },
  { href: '/client-history', label: 'Mijoz tarixi', icon: UserCircle },
];

function NavLinks({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onLinkClick}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            pathname === href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="px-2 py-2 text-lg font-semibold">ERP</div>
          <NavLinks />
        </div>
      </aside>
      {/* Mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden">
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-4">
          <div className="mb-4 text-lg font-semibold">ERP</div>
          <NavLinks onLinkClick={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
