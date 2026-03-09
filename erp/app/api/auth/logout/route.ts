import { NextResponse } from 'next/server';

const TOKEN_COOKIE = 'erp_token';
const REFRESH_COOKIE = 'erp_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 0,
};

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TOKEN_COOKIE, '', COOKIE_OPTS);
  response.cookies.set(REFRESH_COOKIE, '', COOKIE_OPTS);
  return response;
}
