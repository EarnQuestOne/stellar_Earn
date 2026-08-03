import { z } from 'zod';

/**
 * Validation schemas extracted from QuestWizard.tsx so each wizard step can
 * validate its own data slice independently. First step of decomposing
 * QuestWizard.tsx. Closes #1927.
 */
export const questBasicsSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
});

export const questRewardSchema = z.object({
  rewardAmount: z.number().positive('Reward amount must be positive'),
  deadline: z.coerce.date().refine((d) => d > new Date(), {
    message: 'Deadline must be in the future',
  }),
});

export const questRequirementsSchema = z.object({
  requirements: z.array(z.string()).min(1, 'At least one requirement is needed'),
});

export type QuestBasicsInput = z.infer<typeof questBasicsSchema>;
export type QuestRewardInput = z.infer<typeof questRewardSchema>;
export type QuestRequirementsInput = z.infer<typeof questRequirementsSchema>;
