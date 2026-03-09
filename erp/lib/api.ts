import { logout } from './auth';
import { getErrorMessage, type ApiError } from './errors';

const BASE = '/api/backend';

function redirectToLogin() {
  logout();
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    const msg = getErrorMessage(err);
    const e = new Error(msg) as ApiError;
    e.status = 0;
    throw e;
  }

  if (res.status === 401) {
    redirectToLogin();
    const e = new Error("Sessiya muddati tugadi") as ApiError;
    e.status = 401;
    throw e;
  }

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    let data: { message?: string | string[] };
    try {
      const j = JSON.parse(text);
      data = j;
      if (j.message) {
        message = Array.isArray(j.message) ? j.message.join(', ') : j.message;
      }
    } catch {
      data = {};
    }

    const statusMessages: Record<number, string> = {
      400: "Noto'g'ri ma'lumot kiritildi",
      403: "Ruxsat yo'q",
      404: "Ma'lumot topilmadi",
      409: "Bunday ma'lumot allaqachon mavjud",
      422: message,
      500: "Server xatosi. Iltimos, qayta urinib ko'ring",
    };

    const finalMessage =
      (statusMessages[res.status] ?? message) || `HTTP ${res.status}`;

    const e = new Error(finalMessage) as ApiError;
    e.status = res.status;
    e.data = data;
    throw e;
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = <T>(path: string) =>
  api<T>(path, { method: 'DELETE' });
