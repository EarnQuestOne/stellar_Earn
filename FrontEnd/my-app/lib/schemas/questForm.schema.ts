import { z } from 'zod';

/**
 * Fix #2218: Zod schema for the admin QuestForm.
 * Import and use with react-hook-form's zodResolver to get
 * typed, declarative validation on the quest creation/edit form.
 */
export const questFormSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(120, 'Title must be 120 characters or fewer'),

  description: z
    .string()
    .min(20, 'Description must be at least 20 characters'),

  rewardAmount: z
    .number({ error: 'Reward must be a number' })
    .positive('Reward must be greater than 0')
    .max(1_000_000, 'Reward exceeds maximum allowed'),

  deadline: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), { message: 'Deadline must be a valid date' })
    .refine((v) => new Date(v) > new Date(), { message: 'Deadline must be in the future' }),

  category: z.string().min(1, 'Category is required'),

  maxSubmissions: z
    .number({ error: 'Max submissions must be a number' })
    .int()
    .positive()
    .optional(),
});

export type QuestFormValues = z.infer<typeof questFormSchema>;