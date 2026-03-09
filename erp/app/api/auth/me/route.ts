import { NextRequest, NextResponse } from 'next/server';

const TOKEN_COOKIE = 'erp_token';

function decodePayload(token: string): { login?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ login: null }, { status: 401 });
  }
  const payload = decodePayload(token);
  return NextResponse.json({ login: payload?.login ?? null });
}
