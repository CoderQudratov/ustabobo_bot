'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiPost, apiPatch } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const createSchema = z.object({
  fullname: z.string().min(1, 'Ism kiriting'),
  phone: z.string().min(1, 'Telefon kiriting'),
  login: z.string().min(3, 'Login kamida 3 belgi'),
  password: z.string().min(6, 'Parol kamida 6 belgi'),
  role: z.enum(['master', 'driver']),
  percent_rate: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

const editSchema = createSchema.extend({ password: z.string().optional() });

type CreateForm = z.infer<typeof createSchema>;

type User = { id: string; fullname: string; phone: string; login: string; role: string; percent_rate: string; is_active: boolean };

export function UserForm({
  mode,
  user,
  onSuccess,
  onCancel,
}: {
  mode: 'create' | 'edit';
  user?: User | null;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  type FormData = CreateForm & { password?: string };
  const form = useForm<FormData>({
    resolver: zodResolver(mode === 'create' ? createSchema : editSchema) as Resolver<FormData>,
    defaultValues:
      mode === 'edit' && user
        ? {
            fullname: user.fullname,
            phone: user.phone,
            login: user.login,
            password: '',
            role: user.role as 'master' | 'driver',
            percent_rate: Number(user.percent_rate) || 0,
            is_active: user.is_active,
          }
        : { fullname: '', phone: '', login: '', password: '', role: 'master', percent_rate: 0, is_active: true },
  });

  const createMu = useMutation({
    mutationFn: (d: CreateForm) => apiPost('/admin/users', { ...d, percent_rate: d.percent_rate ?? 0, is_active: d.is_active ?? true }),
    onSuccess,
    onError: (e: Error) => form.setError('root', { message: e.message }),
  });
  const updateMu = useMutation({
    mutationFn: (d: Partial<CreateForm> & { password?: string }) => {
      const payload: Record<string, unknown> = { fullname: d.fullname, phone: d.phone, login: d.login, role: d.role, percent_rate: d.percent_rate, is_active: d.is_active };
      if (d.password && d.password.length >= 6) payload.password = d.password;
      return apiPatch(`/admin/users/${user!.id}`, payload);
    },
    onSuccess,
    onError: (e: Error) => form.setError('root', { message: e.message }),
  });

  const onSubmit = (data: CreateForm & { password?: string }) => {
    if (mode === 'create') {
      createMu.mutate({ ...data, password: data.password! });
    } else {
      updateMu.mutate(data);
    }
  };

  const pending = createMu.isPending || updateMu.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Yangi xodim' : 'Tahrirlash'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Ism</Label>
            <Input {...form.register('fullname')} />
            {form.formState.errors.fullname && <p className="text-destructive text-sm">{form.formState.errors.fullname.message}</p>}
          </div>
          <div>
            <Label>Telefon</Label>
            <Input {...form.register('phone')} />
            {form.formState.errors.phone && <p className="text-destructive text-sm">{form.formState.errors.phone.message}</p>}
          </div>
          <div>
            <Label>Login</Label>
            <Input {...form.register('login')} disabled={mode === 'edit'} />
            {form.formState.errors.login && <p className="text-destructive text-sm">{form.formState.errors.login.message}</p>}
          </div>
          <div>
            <Label>Parol {mode === 'edit' && '(bo‘sh qoldiring o‘zgartirmaslik uchun)'}</Label>
            <Input type="password" {...form.register('password')} />
            {form.formState.errors.password && <p className="text-destructive text-sm">{form.formState.errors.password.message}</p>}
          </div>
          <div>
            <Label>Rol</Label>
            <Select value={form.watch('role')} onValueChange={(v) => form.setValue('role', v as 'master' | 'driver')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="master">Usta</SelectItem>
                <SelectItem value="driver">Haydovchi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Foiz</Label>
            <Input type="number" {...form.register('percent_rate', { valueAsNumber: true })} />
          </div>
          {form.formState.errors.root && <p className="text-destructive text-sm">{form.formState.errors.root.message}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>Bekor</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Kutilmoqda…' : 'Saqlash'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
