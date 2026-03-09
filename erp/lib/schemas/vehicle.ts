import { z } from 'zod';

const currentYear = new Date().getFullYear();

/**
 * Client-side validation for create vehicle form.
 * Matches backend AdminCreateVehicleDto (plate_number, model, year?, color?, vin?).
 */
export const CreateVehicleSchema = z.object({
  plate_number: z
    .string()
    .min(1, 'Davlat raqami kiritilishi shart')
    .max(20, 'Davlat raqami 20 ta belgidan oshmasligi kerak')
    .refine(
      (v) => /^[A-Za-z0-9\s\-]+$/.test(v.trim()),
      'Faqat harflar, raqamlar va bo‘sh joy',
    ),
  model: z
    .string()
    .min(1, 'Model kiritilishi shart')
    .max(255, 'Model 255 ta belgidan oshmasligi kerak'),
  year: z
    .string()
    .optional()
    .refine(
      (s) => {
        if (!s || !s.trim()) return true;
        const n = parseInt(s.trim(), 10);
        return !Number.isNaN(n) && n >= 1900 && n <= currentYear + 1;
      },
      `Yil 1900–${currentYear + 1} orasida bo‘lishi kerak`,
    ),
  color: z
    .string()
    .max(50, 'Rang 50 ta belgidan oshmasligi kerak')
    .optional()
    .nullable(),
  vin: z
    .string()
    .max(50, 'VIN 50 ta belgidan oshmasligi kerak')
    .optional()
    .nullable()
    .refine(
      (v) => !v || v.trim() === '' || /^[A-Za-z0-9]{17}$/.test(v.trim()),
      'VIN 17 ta belgidan iborat bo‘lishi kerak (harf va raqam)',
    ),
});

export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;

/** Form default values. */
export const createVehicleDefaultValues: CreateVehicleInput = {
  plate_number: '',
  model: '',
  year: '',
  color: '',
  vin: '',
};
