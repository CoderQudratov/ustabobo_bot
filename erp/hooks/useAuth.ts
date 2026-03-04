'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const token = mounted ? getToken() : null;
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!mounted) return;
    if (!token && !isLoginPage) {
      router.replace('/login');
    }
  }, [mounted, token, isLoginPage, router]);

  return { token, isAuthenticated: !!token };
}

export function getLoginFromToken(): string | null {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split('.')[1] ?? ''));
    return payload.login ?? null;
  } catch {
    return null;
  }
}
