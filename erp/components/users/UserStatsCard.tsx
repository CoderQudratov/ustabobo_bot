'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatSom } from '@/lib/dashboard';
import type { Order, OrdersListRes } from '@/lib/types';
import type { User } from '@/lib/types';

interface UserStatsCardProps {
  user: User;
  trigger: React.ReactNode;
}

export function UserStatsCard({ user, trigger }: UserStatsCardProps) {
  const [open, setOpen] = useState(false);

  const isMaster = user.role === 'master';
  const isDriver = user.role === 'driver';

  const { data: completedData } = useQuery({
    queryKey: ['orders', 'master', user.id, 'completed'],
    queryFn: () =>
      apiGet<OrdersListRes>(
        `/admin/orders?master_id=${user.id}&status=completed&page=1&limit=1`
      ),
    enabled: open && isMaster,
  });

  const { data: recentOrdersData } = useQuery({
    queryKey: ['orders', 'master', user.id, 'recent'],
    queryFn: () =>
      apiGet<OrdersListRes>(
        `/admin/orders?master_id=${user.id}&page=1&limit=100`
      ),
    enabled: open && isMaster,
  });

  const stats = (() => {
    if (!isMaster) {
      return {
        completedCount: null as number | null,
        currentMonthRevenue: null as number | null,
        lastActivityAt: null as string | null,
        isActiveRecent: null as boolean | null,
      };
    }
    const completedCount = completedData?.total ?? 0;
    const items = (recentOrdersData?.items ?? []) as Order[];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const currentMonthRevenue = items
      .filter((o) => {
        if (o.status !== 'completed' || !o.completed_at) return false;
        const d = new Date(o.completed_at);
        return d >= thisMonthStart;
      })
      .reduce((s, o) => s + Number(o.total_amount), 0);

    const lastOrder = items[0];
    const lastActivityAt = lastOrder
      ? lastOrder.completed_at || lastOrder.created_at
      : null;

    const isActiveRecent = items.some((o) => {
      const d = new Date(o.completed_at || o.created_at);
      return d >= sevenDaysAgo;
    });

    return {
      completedCount,
      currentMonthRevenue,
      lastActivityAt,
      isActiveRecent,
    };
  })();

  const loading = open && isMaster && (completedData === undefined || recentOrdersData === undefined);

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Xodim statistikasi — {user.fullname}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {user.role === 'boss' && (
              <p className="text-muted-foreground">
                Boss uchun buyurtma statistikasi hisoblanmaydi.
              </p>
            )}
            {isDriver && (
              <>
                <div>
                  <span className="text-muted-foreground">
                    Jami bajarilgan buyurtmalar:{' '}
                  </span>
                  <span>—</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Joriy oy daromadi:{' '}
                  </span>
                  <span>—</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Oxirgi faollik:{' '}
                  </span>
                  <span>—</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  Haydovchi statistikasi backendda driver_id filtri qo‘shilgach
                  ko‘rsatiladi.
                </p>
              </>
            )}
            {isMaster && (
              <>
                {loading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground">
                        Jami bajarilgan buyurtmalar:{' '}
                      </span>
                      <span className="font-medium">
                        {stats.completedCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Joriy oy daromadi (tugallangan buyurtmalar):{' '}
                      </span>
                      <span className="font-medium">
                        {formatSom(stats.currentMonthRevenue ?? 0)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Oxirgi faollik:{' '}
                      </span>
                      <span className="font-medium">
                        {stats.lastActivityAt
                          ? new Date(stats.lastActivityAt).toLocaleString(
                              'uz-UZ',
                              {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }
                            )
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Holati: </span>
                      <Badge
                        variant={
                          stats.isActiveRecent ? 'default' : 'secondary'
                        }
                      >
                        {stats.isActiveRecent ? 'Aktiv' : 'Nofaol'}
                      </Badge>
                      <span className="ml-2 text-muted-foreground">
                        (oxirgi 7 kun ichida buyurtma{' '}
                        {stats.isActiveRecent ? 'bor' : 'yo‘q'})
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
