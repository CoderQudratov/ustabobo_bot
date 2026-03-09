'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { logout as doLogout } from '@/lib/auth';

export interface AuthUser {
  login: string | null;
  tenant_id: string | null;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(() => {
    doLogout();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || pathname === '/login') return;

    fetch('/api/auth/status', { credentials: 'include' })
      .then((r) => {
        setIsAuthenticated(r.ok);
        if (!r.ok) {
          setUser(null);
          router.replace('/login');
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setUser(null);
        router.replace('/login');
      });
  }, [mounted, pathname, router]);

  useEffect(() => {
    if (!mounted || pathname === '/login' || isAuthenticated !== true) return;

    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setUser({
            login: data.login ?? null,
            tenant_id: data.tenant_id ?? null,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null));
  }, [mounted, pathname, isAuthenticated]);

  const isLoading = mounted && pathname !== '/login' && isAuthenticated === null;

  return {
    isAuthenticated: isAuthenticated === true,
    isLoading,
    user: isAuthenticated === true ? user : null,
    logout,
  };
}

export async function getLoginFromToken(): Promise<string | null> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) return null;
  const data = await res.json();
  return data.login ?? null;
}
