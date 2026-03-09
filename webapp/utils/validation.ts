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
 * O'zbekiston davlat raqami — yuridik va jismoniy shaxslar, barcha turlari.
 * Hudud: 01–99. Kiritilgan matn katta harfga o‘giriladi.
 *
 * Qabul qilinadigan formatlar:
 * 1) XX ZZZ LLL — masalan: 01 111 AAA, 01 200 BAA, 99 555 ABC
 * 2) XX Y ZZZ YY — masalan: 01 A 123 AA, 10 B 45 BB
 */
const REGION = "0[1-9]|[1-9][0-9]"; // 01–99
const FORMAT_ZZZ_LLL = new RegExp(`^(${REGION})\\d{3}[A-Za-z]{3}$`);      // XX ZZZ LLL
const FORMAT_Y_ZZZ_YY = new RegExp(`^(${REGION})[A-Za-z]\\d{1,3}[A-Za-z]{2}$`); // XX Y ZZZ YY

export const UZBEK_PLATE_REGEX = new RegExp(
  `^(${REGION})(\\d{3}[A-Za-z]{3}|[A-Za-z]\\d{1,3}[A-Za-z]{2})$`
);

/** Bo‘shliqlarni bitta qilib, katta harfga o‘giradi (kirishda ko‘rsatish uchun). */
export function normalizeUzbekPlate(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function isValidUzbekPlate(value: string): boolean {
  const s = value.trim().toUpperCase().replace(/\s+/g, "");
  return FORMAT_ZZZ_LLL.test(s) || FORMAT_Y_ZZZ_YY.test(s);
}

export const UZBEK_PLATE_PLACEHOLDER = "01 111 AAA yoki 01 A 123 AA";
