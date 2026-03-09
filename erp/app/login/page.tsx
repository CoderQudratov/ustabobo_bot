'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { login } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Lock, Loader2 } from 'lucide-react';

const schema = z.object({
  login: z.string().min(1, 'Login kiriting'),
  password: z.string().min(1, 'Parol kiriting'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    try {
      await login(data.login, data.password);
      toast.success('Kirish muvaffaqiyatli');
      router.replace('/dashboard');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Login yoki parol noto‘g‘ri';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      {/* Animated gradient blob */}
      <div
        className="absolute left-0 top-1/4 h-96 w-96 rounded-full bg-primary opacity-30 blur-[100px] animate-blob"
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 right-0 h-80 w-80 rounded-full bg-purple-500 opacity-20 blur-[80px] animate-blob"
        style={{ animationDelay: '2s' }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-surface p-10 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mb-2 text-3xl">⚙️</div>
            <h1 className="font-heading text-2xl font-bold text-text-primary">
              AVTO PRO
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Avtomobil servis boshqaruv tizimi
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label
                htmlFor="login"
                className="text-text-secondary font-medium"
              >
                Login
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="login"
                  type="text"
                  autoComplete="username"
                  className="h-11 border-border bg-surface-2 pl-10 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('login')}
                />
              </div>
              {errors.login && (
                <p className="text-sm text-danger">{errors.login.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-text-secondary font-medium"
              >
                Parol
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="h-11 border-border bg-surface-2 pl-10 text-text-primary placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full bg-primary text-white hover:bg-primary-hover hover:shadow-lg hover:shadow-primary-glow active:translate-y-0 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Kiritilmoqda…
                </>
              ) : (
                'Kirish'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
