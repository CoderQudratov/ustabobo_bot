import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'erp_token';
const REFRESH_COOKIE = 'erp_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function getBackendUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { login, password } = body;
    if (!login || !password) {
      return NextResponse.json(
        { message: 'Login va parol kerak' },
        { status: 400 }
      );
    }

    const res = await fetch(`${getBackendUrl()}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message ?? 'Login yoki parol noto‘g‘ri' },
        { status: res.status }
      );
    }

    const { access_token, refresh_token, expires_in } = data;
    if (!access_token || !refresh_token) {
      return NextResponse.json(
        { message: 'Server javobida token yo‘q' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(TOKEN_COOKIE, access_token, {
      ...COOKIE_OPTS,
      maxAge: expires_in ?? 3600,
    });
    response.cookies.set(REFRESH_COOKIE, refresh_token, {
      ...COOKIE_OPTS,
      maxAge: 604800,
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
