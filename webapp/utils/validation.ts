/**
 * O'zbekiston mobil raqami: 9x xxx xx xx (9 xona), +998 ixtiyoriy.
 * Masalan: 90 123 45 67, +998901234567
 */
export const UZBEK_PHONE_REGEX = /^\+?(\s*998)?\s*\d{2}\s*\d{3}\s*\d{2}\s*\d{2}$/;

/** Normalize phone: faqat raqamlar — tekshirish uchun. */
export function normalizeUzbekPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("998") && digits.length === 12) return digits.slice(3);
  return digits;
}

/** 9 xonali mobil raqam (90/91/93/94/97 va hokazo). */
export function isValidUzbekPhone(value: string): boolean {
  const norm = normalizeUzbekPhone(value);
  return norm.length === 9 && norm.startsWith("9") && /^9[0-9]{8}$/.test(norm);
}

export const UZBEK_PHONE_PLACEHOLDER = "90 123 45 67";

/**
 * O'zbekiston davlat raqami: 01-14 (hudud), harf, 1-3 raqam, 2 harf.
 * Masalan: 01 A 123 AA, 10 B 45 BB
 */
export const UZBEK_PLATE_REGEX = /^(0[1-9]|1[0-4])\s*[A-Za-z]\s*\d{1,3}\s*[A-Za-z]{2}$/;

export function normalizeUzbekPlate(value: string): string {
  return value.replace(/\s+/g, "").trim().toUpperCase();
}

export function isValidUzbekPlate(value: string): boolean {
  const norm = normalizeUzbekPlate(value);
  return /^(0[1-9]|1[0-4])[A-Z]\d{1,3}[A-Z]{2}$/.test(norm);
}

export const UZBEK_PLATE_PLACEHOLDER = "01 A 123 AA";
