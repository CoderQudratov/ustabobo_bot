'use client';

import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Phone } from 'lucide-react';

const SUPPORT_PHONE = '+998901234567';

export function SubscriptionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { data: status } = useSubscription();

  // Super admin uchun tekshirish kerak emas
  if (!user || user.is_super_admin) return <>{children}</>;

  // Bloklangan → to'liq ekran
  if (status?.is_blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="max-w-md space-y-6 p-8 text-center">
          <div className="text-6xl">🔒</div>
          <div>
            <h1 className="text-2xl font-bold text-red-600">
              Abonent muddati tugadi
            </h1>
            <p className="mt-2 text-gray-500">
              Tizimdan foydalanish to&apos;xtatildi. Ma&apos;lumotlaringiz
              saqlanib turibdi.
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-900">
            <p className="font-medium">To&apos;lov uchun murojaat:</p>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
              className="mt-2 flex items-center justify-center gap-2 font-medium text-blue-600"
            >
              <Phone size={16} /> {SUPPORT_PHONE}
            </a>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mx-auto flex items-center gap-2 text-gray-500 hover:text-red-500"
          >
            <LogOut size={16} /> Chiqish
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 3 kun banner */}
      {status?.days_left !== null &&
        status?.days_left <= 3 &&
        status?.days_left > 0 && (
          <div className="bg-red-500 px-4 py-2 text-center text-sm font-medium text-white">
            🚨 Abonent muddati {status.days_left} kun ichida tugaydi!
            To&apos;lov uchun murojaat qiling: {SUPPORT_PHONE}
          </div>
        )}

      {/* 7 kun banner */}
      {status?.days_left !== null &&
        status?.days_left > 3 &&
        status?.days_left <= 7 && (
          <div className="bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-white">
            ⚠️ Abonent muddati {status.days_left} kun ichida tugaydi. Eslatma:
            o&apos;z vaqtida to&apos;lang.
          </div>
        )}

      {children}
    </>
  );
}
