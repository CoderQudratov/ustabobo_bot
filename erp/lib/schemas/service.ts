import { z } from 'zod';

/**
 * Client-side validation for create/update service form.
 * Matches backend (name, price).
 */
export const CreateServiceSchema = z.object({
  name: z
    .string()
    .min(1, 'Xizmat nomi kiritilishi shart')
    .max(255, 'Nomi 255 ta belgidan oshmasligi kerak'),
  price: z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Narx kiritilishi shart' : 'Narx son bo‘lishi kerak',
    })
    .positive('Narx 0 dan katta bo‘lishi kerak'),
});

export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
