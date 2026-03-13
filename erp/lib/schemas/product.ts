import { z } from 'zod';

/**
 * Client-side validation for create/update product form.
 * Matches backend (name, cost_price, sale_price, stock_count, min_limit).
 */
export const CreateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Mahsulot nomi kiritilishi shart')
    .max(255, 'Nomi 255 ta belgidan oshmasligi kerak'),
  supplier_id: z.string().uuid().optional().nullable(),
  cost_price: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Kelgan narx kiritilishi shart' : 'Son kiriting',
    })
    .min(0, 'Kelgan narx manfiy bo‘lmasligi kerak'),
  sale_price: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Sotish narxi kiritilishi shart' : 'Son kiriting',
    })
    .min(0, 'Sotish narxi manfiy bo‘lmasligi kerak'),
  stock_count: z
    .number({ error: 'Son kiriting' })
    .min(0, 'Qoldiq manfiy bo‘lmasligi kerak'),
  min_limit: z
    .number({ error: 'Son kiriting' })
    .min(0, 'Minimal limit manfiy bo‘lmasligi kerak'),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
