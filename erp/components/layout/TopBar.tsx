'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { removeToken } from '@/lib/auth';
import { getLoginFromToken } from '@/hooks/useAuth';

export function TopBar() {
  const router = useRouter();
  const login = getLoginFromToken();

  const handleLogout = () => {
    removeToken();
    router.replace('/login');
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
      <span className="text-sm font-medium text-muted-foreground">
        {login ? `${login}` : 'Boss'}
      </span>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="mr-2 h-4 w-4" />
        Chiqish
      </Button>
    </header>
  );
}
