'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiDelete } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ServiceFormDialog } from '@/components/services/ServiceFormDialog';

export interface Service {
  id: string;
  name: string;
  price: number | string;
  is_active?: boolean;
}

interface ServicesRes {
  items: Service[];
  total: number;
  page: number;
  limit: number;
}

export default function ServicesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiGet<ServicesRes>('/admin/services?page=1&limit=50'),
  });

  const items = data?.items ?? [];


  const handleCloseDialog = () => {
    setOpen(false);
    setEditService(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    setOpen(false);
    setEditService(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await apiDelete(`/admin/services/${deleteId}`);
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } finally {
      setDeleteId(null);
    }
  };

  const priceValue = (s: Service): number =>
    typeof s.price === 'number' ? s.price : Number(s.price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xizmatlar</h1>
        <Button
          onClick={() => {
            setEditService(null);
            setOpen(true);
          }}
        >
          + Xizmat qo&apos;shish
        </Button>
      </div>

      {/* Table or empty state */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Xizmatlar yo&apos;q</p>
              <Button
                onClick={() => setOpen(true)}
                className="mt-4"
              >
                Birinchi xizmatni qo&apos;shish
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left font-medium">Nomi</th>
                    <th className="p-3 text-right font-medium">Narxi (so&apos;m)</th>
                    <th className="p-3 text-right font-medium">Davomiyligi (min)</th>
                    <th className="p-3 text-left font-medium">Holati</th>
                    <th className="p-3 text-right font-medium">Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-b">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-right">
                        {priceValue(s).toLocaleString('uz-UZ')} so&apos;m
                      </td>
                      <td className="p-3 text-right text-muted-foreground">—</td>
                      <td className="p-3">
                        <Badge variant={s.is_active !== false ? 'default' : 'secondary'}>
                          {s.is_active !== false ? 'Aktiv' : 'Nofaol'}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditService(s);
                              setOpen(true);
                            }}
                          >
                            Tahrirlash
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteId(s.id)}
                          >
                            O&apos;chirish
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit dialog */}
      {open && (
        <ServiceFormDialog
          service={
            editService
              ? { ...editService, price: String(editService.price) }
              : null
          }
          onSuccess={handleSuccess}
          onCancel={handleCloseDialog}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xizmatni o&apos;chirish</AlertDialogTitle>
            <AlertDialogDescription>
              Ushbu xizmatni o&apos;chirishga ishonchingiz komilmi? Bu amalni bekor qilib
              bo&apos;lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault();
                await handleDeleteConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              O&apos;chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
