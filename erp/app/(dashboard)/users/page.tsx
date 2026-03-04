'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPatch } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { UserForm } from '@/components/users/UserForm';

type User = {
  id: string;
  fullname: string;
  phone: string;
  login: string;
  role: string;
  percent_rate: string;
  is_active: boolean;
  balance?: string;
};

type UsersRes = { items: User[]; total: number; page: number; limit: number };

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', '20');
  if (role) params.set('role', role);
  if (isActive === 'true') params.set('is_active', 'true');
  if (isActive === 'false') params.set('is_active', 'false');

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, role, isActive],
    queryFn: () => apiGet<UsersRes>(`/admin/users?${params}`),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => apiPatch<User>(`/admin/users/${id}/toggle-active`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('O‘zgartirildi');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Xodimlar</h1>
        <Button onClick={() => setAddOpen(true)}>Yangi xodim</Button>
      </div>
      <Card className="mb-4">
        <CardContent className="flex flex-wrap gap-4 pt-6">
          <div className="space-y-2">
            <span className="text-sm font-medium">Rol</span>
            <Select value={role || 'all'} onValueChange={(v) => setRole(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barchasi</SelectItem>
                <SelectItem value="master">Usta</SelectItem>
                <SelectItem value="driver">Haydovchi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-sm font-medium">Aktiv</span>
            <Select value={isActive || 'all'} onValueChange={(v) => setIsActive(v === 'all' ? '' : v)}>
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
                      <th className="p-3 text-left font-medium">Ism</th>
                      <th className="p-3 text-left font-medium">Telefon</th>
                      <th className="p-3 text-left font-medium">Login</th>
                      <th className="p-3 text-left font-medium">Rol</th>
                      <th className="p-3 text-left font-medium">Foiz</th>
                      <th className="p-3 text-left font-medium">Balans</th>
                      <th className="p-3 text-left font-medium">Aktiv</th>
                      <th className="p-3 text-right font-medium">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.items ?? []).map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-3">{u.fullname}</td>
                        <td className="p-3">{u.phone}</td>
                        <td className="p-3">{u.login}</td>
                        <td className="p-3">{u.role === 'master' ? 'Usta' : u.role === 'driver' ? 'Haydovchi' : u.role}</td>
                        <td className="p-3">{Number(u.percent_rate)}%</td>
                        <td className="p-3">{u.balance != null ? Number(u.balance).toLocaleString('uz-UZ') : '—'}</td>
                        <td className="p-3">{u.is_active ? 'Ha' : 'Yo‘q'}</td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setEditUser(u)}>Tahrirlash</Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive.mutate(u.id)}
                            disabled={toggleActive.isPending}
                          >
                            {u.is_active ? 'O‘chirish' : 'Yoqish'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between border-t px-4 py-2">
                <span className="text-muted-foreground">Jami: {data?.total ?? 0}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Oldingi</Button>
                  <Button variant="outline" size="sm" disabled={!data || page * 20 >= data.total} onClick={() => setPage((p) => p + 1)}>Keyingi</Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {addOpen && (
        <UserForm
          mode="create"
          onSuccess={() => { setAddOpen(false); queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Qo‘shildi'); }}
          onCancel={() => setAddOpen(false)}
        />
      )}
      {editUser && (
        <UserForm
          mode="edit"
          user={editUser}
          onSuccess={() => { setEditUser(null); queryClient.invalidateQueries({ queryKey: ['users'] }); toast.success('Saqlandi'); }}
          onCancel={() => setEditUser(null)}
        />
      )}
    </div>
  );
}
