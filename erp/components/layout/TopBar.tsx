'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

export function TopBar() {
  const [login, setLogin] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { login: null }))
      .then((d) => setLogin(d.login ?? null))
      .catch(() => setLogin(null));
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
      <span className="text-sm font-medium text-muted-foreground">
        {login ?? 'Boss'}
      </span>
      <Button variant="ghost" size="sm" onClick={() => logout()}>
        <LogOut className="mr-2 h-4 w-4" />
        Chiqish
      </Button>
    </header>
  );
}
