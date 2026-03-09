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
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ message: 'Refresh token yo‘q' }, { status: 401 });
  }

  try {
    const res = await fetch(`${getBackendUrl()}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { message: data.message ?? 'Refresh muvaffaqiyatsiz' },
        { status: res.status }
      );
    }

    const { access_token, expires_in } = data;
    if (!access_token) {
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

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Server xatosi' },
      { status: 500 }
    );
  }
}
