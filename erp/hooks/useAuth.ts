'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pathname === '/login') return;

    fetch('/api/auth/status', { credentials: 'include' })
      .then((r) => {
        setIsAuthenticated(r.ok);
        if (!r.ok) {
          router.replace('/login');
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        router.replace('/login');
      });
  }, [mounted, pathname, router]);

  const isLoading = mounted && pathname !== '/login' && isAuthenticated === null;

  return {
    isAuthenticated: isAuthenticated === true,
    isLoading,
  };
}

export async function getLoginFromToken(): Promise<string | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.login ?? null;
}
