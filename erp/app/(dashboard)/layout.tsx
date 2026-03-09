'use client';

import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="print:hidden shrink-0">
        <TopBar />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="print:hidden flex h-full min-h-0">
          <Sidebar />
        </div>
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg)] p-4 md:p-6 print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
