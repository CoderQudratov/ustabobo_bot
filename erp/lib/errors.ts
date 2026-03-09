/**
 * Global error handling — API va Query xatolarini foydalanuvchiga tushunarli qiladi.
 */

const STATUS_MESSAGES: Record<number, string> = {
  400: "Noto'g'ri ma'lumot kiritildi",
  401: "Sessiya muddati tugadi",
  403: "Ruxsat yo'q",
  404: "Ma'lumot topilmadi",
  409: "Bunday ma'lumot allaqachon mavjud",
  422: "Validatsiya xatosi",
  500: "Server xatosi. Iltimos, qayta urinib ko'ring",
};

export interface ApiError extends Error {
  status?: number;
  data?: { message?: string | string[] };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('network')) {
      return "Internet ulanishi yo'q";
    }
    if (msg === 'Unauthorized') {
      return "Sessiya muddati tugadi";
    }
    const apiErr = error as ApiError;
    if (apiErr.status) {
      const defaultMsg = STATUS_MESSAGES[apiErr.status] ?? `Xatolik (${apiErr.status})`;
      if (apiErr.status === 422 && apiErr.data?.message) {
        const m = apiErr.data.message;
        return Array.isArray(m) ? m.join(', ') : m;
      }
      if (apiErr.data?.message && apiErr.status !== 500) {
        const m = apiErr.data.message;
        return Array.isArray(m) ? m.join(', ') : m;
      }
      return defaultMsg;
    }
    return msg || "Noma'lum xatolik";
  }
  return "Noma'lum xatolik";
}
