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
      <div className="print:hidden">
        <TopBar />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="print:hidden">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6 print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
