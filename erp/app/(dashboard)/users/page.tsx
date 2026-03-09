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
import { Crown, Wrench, Car, Pencil, Ban, UserSearch, Plus, ChevronDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  if (role === 'boss') {
    return (
      <Badge variant="outline" className="gap-1 bg-purple-500/15 text-purple-400 border-purple-500/30">
        <Crown className="h-4 w-4" />
        {roleLabel(role)}
      </Badge>
    );
  }
  if (role === 'master') {
    return (
      <Badge variant="outline" className="gap-1 bg-blue-500/15 text-blue-400 border-blue-500/30">
        <Wrench className="h-4 w-4" />
        {roleLabel(role)}
      </Badge>
    );
  }
  if (role === 'driver') {
    return (
      <Badge variant="outline" className="gap-1 bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
        <Car className="h-4 w-4" />
        {roleLabel(role)}
      </Badge>
    );
  }
  return <Badge variant="outline">{roleLabel(role)}</Badge>;
}

const AVATAR_COLORS = [
  'bg-teal-500/20 text-teal-400',
  'bg-violet-500/20 text-violet-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
];
function avatarColor(str: string): string {
  let n = 0;
  for (let i = 0; i < str.length; i++) n += str.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name.slice(0, 2) || '—').toUpperCase();
}

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const total = data?.total ?? 0;
  const activeFiltersCount = [role, isActive].filter(Boolean).length + (searchInput.trim() ? 1 : 0);
  const clearFilters = () => {
    setRole('');
    setIsActive('');
    setSearchInput('');
    setPage(1);
  };
  const limit = 20;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const pageNumbers = (() => {
    const p: number[] = [];
    const show = 3;
    let start = Math.max(1, page - 1);
    let end = Math.min(totalPages, start + show - 1);
    if (end - start + 1 < show) start = Math.max(1, end - show + 1);
    for (let i = start; i <= end; i++) p.push(i);
    return p;
  })();

  return (
    <div className="space-y-5">
      <div className="mb-5 border-b border-[var(--border)] pb-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-1)]">
              Xodimlar
            </h1>
            <p className="mt-0.5 text-[13px] text-[var(--text-3)]">
              Jami {total} ta xodim
            </p>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Yangi xodim
          </Button>
        </div>
      </div>

      <Card>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-[var(--bg-2)]"
        >
          <span className="flex items-center gap-2 font-medium text-[var(--text-1)]">
            Filtrlar
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs text-[var(--accent)]">
                {activeFiltersCount}
              </span>
            )}
          </span>
          <ChevronDown
            className={cn('h-5 w-5 text-[var(--text-3)] transition-transform', filtersOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-200 ease-in-out',
            filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden">
            <CardContent className="flex flex-wrap items-end gap-4 border-t border-[var(--border)] pt-4">
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
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Filterni tozalash
                </Button>
              )}
            </CardContent>
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)]">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="animate-shimmer h-[48px] border-b border-[var(--border)] last:border-b-0"
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-2)] text-[var(--text-3)]">
                <Users className="h-8 w-8" />
              </div>
              <p className="font-semibold text-[var(--text-1)]">Ma&apos;lumot topilmadi</p>
              <p className="text-sm text-[var(--text-3)]">Filtrlarni o&apos;zgartiring</p>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Filterni tozalash
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-2)]">
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
                        Telegram ID
                      </th>
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Ism</th>
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Rol</th>
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Telefon</th>
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">
                        Ro‘yxatdan o‘tgan
                      </th>
                      <th className="p-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Holati</th>
                      <th className="p-3 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-3)]">Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-6 text-center text-[var(--text-3)]"
                        >
                          {items.length === 0
                            ? 'Xodimlar yo‘q'
                            : 'Qidiruv bo‘yicha natija topilmadi'}
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((u) => (
                        <tr
                          key={u.id}
                          className="h-14 border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-2)]"
                        >
                          <td className="p-3 font-mono text-[var(--text-3)]">
                            {u.tg_id ?? '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                                  avatarColor(u.fullname || '')
                                )}
                              >
                                {initials(u.fullname || '—')}
                              </div>
                              <span className="font-medium">{u.fullname}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="p-3 font-mono text-sm tracking-wide text-muted-foreground">
                            {u.phone}
                          </td>
                          <td className="p-3 text-[var(--text-3)]">
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
                            <div className="flex items-center justify-end gap-1">
                              <UserStatsCard
                                user={u}
                                trigger={
                                  <span className="flex items-center gap-1.5 text-blue-500" title="Batafsil">
                                    <UserSearch className="h-4 w-4" />
                                  </span>
                                }
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                                title="Tahrirlash"
                                onClick={() => setEditUser(u)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                title={u.is_active ? 'Bloklash' : 'Faollashtirish'}
                                onClick={() => toggleMutation.mutate(u.id)}
                                disabled={toggleMutation.isPending}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3">
                <span className="text-sm text-[var(--text-3)]">
                  Jami: {total}
                  {debouncedSearch && ` (qidiruv: ${filteredItems.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Oldingi
                  </Button>
                  {pageNumbers.map((n) => (
                    <Button
                      key={n}
                      variant={n === page ? 'default' : 'ghost'}
                      size="sm"
                      className={cn(
                        'min-w-[2rem]',
                        n === page && 'bg-[var(--accent)] text-white hover:opacity-90'
                      )}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!data || page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Keyingi →
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
