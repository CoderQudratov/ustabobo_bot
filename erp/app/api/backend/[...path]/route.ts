import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'erp_token';
const REFRESH_COOKIE = 'erp_refresh';

function getBackendUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  return base.replace(/\/$/, '');
}

async function doRefresh(request: NextRequest): Promise<string | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const res = await fetch(`${getBackendUrl()}/admin/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.access_token ?? null;
}

async function proxy(
  request: NextRequest,
  path: string,
  token: string | null,
  retried = false
): Promise<Response> {
  const backendUrl = `${getBackendUrl()}/${path.replace(/^\//, '')}`;
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (['POST', 'PATCH', 'PUT'].includes(request.method) && request.body) {
    init.body = request.body;
  }

  const res = await fetch(backendUrl, init);

  if (res.status === 401 && !retried) {
    const newToken = await doRefresh(request);
    if (newToken) {
      const retryRes = await proxy(request, path, newToken, true);
      const body = await retryRes.text();
      const nextRes = new NextResponse(body, {
        status: retryRes.status,
        headers: { 'Content-Type': retryRes.headers.get('Content-Type') ?? 'application/json' },
      });
      nextRes.cookies.set(TOKEN_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 3600,
      });
      return nextRes;
    }
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const contentType = res.headers.get('content-type');
  const text = await res.text();
  const nextRes = new NextResponse(text, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      'Content-Type': contentType ?? 'application/json',
    },
  });

  return nextRes;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? null;
  return proxy(request, pathStr, token);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? null;
  return proxy(request, pathStr, token);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? null;
  return proxy(request, pathStr, token);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? null;
  return proxy(request, pathStr, token);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const token = request.cookies.get(TOKEN_COOKIE)?.value ?? null;
  return proxy(request, pathStr, token);
}
