/**
 * Auth utilities — token httpOnly cookie orqali saqlanadi.
 * Client hech qachon tokenni o‘qimaydi (XSS himoyasi).
 */

export async function login(login: string, password: string): Promise<void> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ login, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message ?? 'Login yoki parol noto‘g‘ri';
    throw new Error(msg);
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

