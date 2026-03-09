'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { UserForm } from '@/components/users/UserForm';
import { UserStatsCard } from '@/components/users/UserStatsCard';
import type { User, UsersListRes } from '@/lib/types';

const DEBOUNCE_MS = 300;

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function roleLabel(r: string): string {
  switch (r) {
    case 'boss':
      return 'Boss';
    case 'master':
      return 'Usta';
    case 'driver':
      return 'Haydovchi';
    default:
      return r;
  }
}

function RoleBadge({ role }: { role: string }) {
  const style =
    role === 'boss'
      ? 'bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-400 dark:border-amber-500/50'
      : role === 'master'
        ? 'bg-blue-500/15 text-blue-700 border-blue-500/40 dark:text-blue-400 dark:border-blue-500/50'
        : role === 'driver'
          ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-400 dark:border-emerald-500/50'
          : '';
  return (
    <Badge variant="outline" className={style || undefined}>
      {roleLabel(role)}
    </Badge>
  );
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const debouncedSearch = useDebouncedValue(searchInput.trim().toLowerCase(), DEBOUNCE_MS);

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (role) params.set('role', role);
  if (isActive === 'true') params.set('is_active', 'true');
  if (isActive === 'false') params.set('is_active', 'false');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, role, isActive],
    queryFn: () => apiGet<UsersListRes>(`/admin/users?${params}`),
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items;
    return items.filter(
      (u) =>
        u.fullname.toLowerCase().includes(debouncedSearch) ||
        u.phone.toLowerCase().includes(debouncedSearch)
    );
  }, [items, debouncedSearch]);

  const toggleMutation = useMutation({
    mutationFn: (id: string) =>
      apiPatch<User>(`/admin/users/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('O‘zgartirildi');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xodimlar</h1>
        <Button onClick={() => setAddOpen(true)}>Yangi xodim</Button>
      </div>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-2">
            <span className="text-sm font-medium">Rol</span>
            <Select
              value={role || 'all'}
              onValueChange={(v) => setRole(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="boss">Boss</SelectItem>
                <SelectItem value="master">Usta</SelectItem>
                <SelectItem value="driver">Haydovchi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Aktiv</span>
            <Select
              value={isActive || 'all'}
              onValueChange={(v) => setIsActive(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="true">Ha</SelectItem>
                <SelectItem value="false">Yo‘q</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Qidiruv (ism, telefon)</span>
            <Input
              placeholder="Qidirish..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left font-medium">
                        Telegram ID
                      </th>
                      <th className="p-3 text-left font-medium">Ism</th>
                      <th className="p-3 text-left font-medium">Rol</th>
                      <th className="p-3 text-left font-medium">Telefon</th>
                      <th className="p-3 text-left font-medium">
                        Ro‘yxatdan o‘tgan
                      </th>
                      <th className="p-3 text-left font-medium">Holati</th>
                      <th className="p-3 text-right font-medium">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-muted-foreground"
                        >
                          {items.length === 0
                            ? 'Xodimlar yo‘q'
                            : 'Qidiruv bo‘yicha natija topilmadi'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((u) => (
                        <tr key={u.id} className="border-b">
                          <td className="p-3">
                            {u.tg_id ?? '—'}
                          </td>
                          <td className="p-3 font-medium">{u.fullname}</td>
                          <td className="p-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="p-3">{u.phone}</td>
                          <td className="p-3">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString(
                                  'uz-UZ'
                                )
                              : '—'}
                          </td>
                          <td className="p-3">
                            {u.is_active ? (
                              <Badge variant="default">Aktiv</Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="bg-destructive/90"
                              >
                                Bloklangan
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <UserStatsCard user={u} trigger="Batafsil" />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditUser(u)}
                              >
                                Tahrirlash
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMutation.mutate(u.id)}
                                disabled={toggleMutation.isPending}
                                className={
                                  !u.is_active
                                    ? 'text-emerald-600 hover:text-emerald-700'
                                    : 'text-destructive hover:text-destructive'
                                }
                              >
                                {u.is_active ? 'Bloklash' : 'Faollashtirish'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
                <span className="text-muted-foreground">
                  Jami: {data?.total ?? 0}
                  {debouncedSearch && ` (filtr: ${filteredItems.length})`}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Oldingi
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!data || page * 20 >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Keyingi
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {addOpen && (
        <UserForm
          mode="create"
          onSuccess={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Qo‘shildi');
          }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      {editUser && (
        <UserForm
          mode="edit"
          user={editUser}
          onSuccess={() => {
            setEditUser(null);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('Saqlandi');
          }}
          onCancel={() => setEditUser(null)}
        />
      )}
    </div>
  );
}
