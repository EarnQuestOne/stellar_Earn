import { parseZonedDateTime, formatZonedDateTime } from '@/lib/utils/date';

export type QuestCategory =
  | 'Development'
  | 'Blockchain'
  | 'Documentation'
  | 'Design'
  | 'Testing'
  | 'Community';

export type RewardAssetType = 'XLM' | 'USDC' | 'AQUA' | 'yXLM';

export type VerificationMode = 'auto' | 'manual';

export type QuestDifficulty =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert';

export interface DeliverableItem {
  id: string;
  title: string;
  details: string;
  required: boolean;
}

export interface MilestoneItem {
  id: string;
  title: string;
  dueDate: string;
}

export interface QuestWizardData {
  basics: {
    title: string;
    shortDescription: string;
    description: string;
    category: QuestCategory;
  };
  requirements: {
    skills: string[];
    deliverables: DeliverableItem[];
  };
  reward: {
    amount: number;
    assetType: RewardAssetType;
    xpReward: number;
  };
  timeline: {
    deadline: string;
    timezone: string;
    milestones: MilestoneItem[];
  };
  verification: {
    mode: VerificationMode;
    instructions: string;
    autoCriteria: string;
  };
  /**
   * Settings that are only editable from the admin entry point. The user-facing
   * flow keeps the defaults, which match the values the wizard previously
   * hard-coded when building its create payload.
   */
  advanced: {
    difficulty: QuestDifficulty;
    maxParticipants: number;
    tags: string[];
  };
}

export const QUEST_CATEGORIES: QuestCategory[] = [
  'Development',
  'Blockchain',
  'Documentation',
  'Design',
  'Testing',
  'Community',
];

export const QUEST_DIFFICULTIES: QuestDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

/** Defaults the user-facing flow uses; previously hard-coded in QuestWizard. */
export const DEFAULT_QUEST_DIFFICULTY: QuestDifficulty = 'intermediate';
export const DEFAULT_QUEST_MAX_PARTICIPANTS = 200;

export const REWARD_ASSETS: Array<{
  value: RewardAssetType;
  name: string;
  issuer: string;
}> = [
  { value: 'XLM', name: 'Lumens', issuer: 'Native Stellar Asset' },
  { value: 'USDC', name: 'USD Coin', issuer: 'Centre / Circle' },
  { value: 'AQUA', name: 'Aqua Token', issuer: 'Aqua Network' },
  { value: 'yXLM', name: 'Yield XLM', issuer: 'Blend Protocol' },
];

export const TIMEZONE_OPTIONS = [
  'UTC',
  'America/New_York',
  'Europe/London',
  'Africa/Lagos',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const QUEST_WIZARD_STEPS = [
  'Quest Basics',
  'Requirements & Criteria',
  'Reward Configuration',
  'Timeline',
  'Verification Settings',
  'Review & Preview',
  'Confirmation',
] as const;

export type QuestWizardStepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Convert a local datetime string to a UTC ISO string using the given timezone.
 * Delegates to the centralised date utility.
 */
export function zonedDateTimeToIso(
  value: string,
  timezone: string
): string | null {
  return parseZonedDateTime(value, timezone);
}

/**
 * Format a local datetime string for human display in the given timezone.
 * Delegates to the centralised date utility.
 */
export function formatWizardDateTime(value: string, timezone: string): string {
  return formatZonedDateTime(value, timezone);
}

export function extractPlainTextFromHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const defaultQuestWizardData: QuestWizardData = {
  basics: {
    title: '',
    shortDescription: '',
    description: '',
    category: 'Development',
  },
  requirements: {
    skills: [''],
    deliverables: [
      {
        id: 'deliverable-1',
        title: '',
        details: '',
        required: true,
      },
    ],
  },
  reward: {
    amount: 100,
    assetType: 'XLM',
    xpReward: 50,
  },
  timeline: {
    deadline: '',
    timezone: 'UTC',
    milestones: [
      {
        id: 'milestone-1',
        title: '',
        dueDate: '',
      },
    ],
  },
  verification: {
    mode: 'manual',
    instructions: '',
    autoCriteria: '',
  },
  advanced: {
    difficulty: DEFAULT_QUEST_DIFFICULTY,
    maxParticipants: DEFAULT_QUEST_MAX_PARTICIPANTS,
    tags: [],
  },
};

export function validateStep(
  step: QuestWizardStepIndex,
  data: QuestWizardData
): ValidationError[] {
  const errors: ValidationError[] = [];
  const descriptionText = extractPlainTextFromHtml(data.basics.description);

  if (step === 0) {
    if (!data.basics.title.trim()) {
      errors.push({
        field: 'basics.title',
        message: 'Quest title is required.',
      });
    }
    if (data.basics.title.trim().length < 8) {
      errors.push({
        field: 'basics.title',
        message: 'Title should be at least 8 characters.',
      });
    }
    if (!data.basics.shortDescription.trim()) {
      errors.push({
        field: 'basics.shortDescription',
        message: 'Short description is required.',
      });
    }
    if (data.basics.shortDescription.trim().length > 200) {
      errors.push({
        field: 'basics.shortDescription',
        message: 'Short description must be 200 characters or less.',
      });
    }
    if (!descriptionText) {
      errors.push({
        field: 'basics.description',
        message: 'Description is required.',
      });
    }
  }

  if (step === 1) {
    const hasSkill = data.requirements.skills.some(
      (skill) => skill.trim().length > 0
    );
    if (!hasSkill) {
      errors.push({
        field: 'requirements.skills',
        message: 'Add at least one required skill.',
      });
    }

    const hasDeliverable = data.requirements.deliverables.some(
      (item) => item.title.trim().length > 0
    );
    if (!hasDeliverable) {
      errors.push({
        field: 'requirements.deliverables',
        message: 'Add at least one deliverable.',
      });
    }
  }

  if (step === 2) {
    if (!Number.isFinite(data.reward.amount) || data.reward.amount <= 0) {
      errors.push({
        field: 'reward.amount',
        message: 'Reward amount must be greater than zero.',
      });
    }
    if (!Number.isFinite(data.reward.xpReward) || data.reward.xpReward < 0) {
      errors.push({
        field: 'reward.xpReward',
        message: 'XP reward must be zero or greater.',
      });
    }
    if (
      !Number.isFinite(data.advanced.maxParticipants) ||
      data.advanced.maxParticipants < 1
    ) {
      errors.push({
        field: 'advanced.maxParticipants',
        message: 'Max participants must be at least 1.',
      });
    }
  }

  if (step === 3) {
    if (!data.timeline.deadline) {
      errors.push({
        field: 'timeline.deadline',
        message: 'Deadline is required.',
      });
    } else {
      const deadlineIso = zonedDateTimeToIso(
        data.timeline.deadline,
        data.timeline.timezone
      );
      if (!deadlineIso || new Date(deadlineIso).getTime() <= Date.now()) {
        errors.push({
          field: 'timeline.deadline',
          message: 'Deadline must be a future date/time.',
        });
      }

      const milestoneEntries = data.timeline.milestones.filter(
        (item) => item.title.trim() || item.dueDate.trim()
      );

      for (const milestone of milestoneEntries) {
        if (!milestone.title.trim()) {
          errors.push({
            field: 'timeline.milestones',
            message: 'Each milestone needs a title.',
          });
          break;
        }

        if (!milestone.dueDate.trim()) {
          errors.push({
            field: 'timeline.milestones',
            message: 'Each milestone needs a due date.',
          });
          break;
        }

        const milestoneIso = zonedDateTimeToIso(
          milestone.dueDate,
          data.timeline.timezone
        );

        if (!milestoneIso) {
          errors.push({
            field: 'timeline.milestones',
            message: 'Milestone dates must be valid.',
          });
          break;
        }

        if (new Date(milestoneIso).getTime() <= Date.now()) {
          errors.push({
            field: 'timeline.milestones',
            message: 'Milestones must be scheduled in the future.',
          });
          break;
        }

        if (deadlineIso && milestoneIso > deadlineIso) {
          errors.push({
            field: 'timeline.milestones',
            message: 'Milestones must be due before the final deadline.',
          });
          break;
        }
      }
    }
  }

  if (step === 4) {
    if (!data.verification.instructions.trim()) {
      errors.push({
        field: 'verification.instructions',
        message: 'Verification instructions are required.',
      });
    }
    if (
      data.verification.mode === 'auto' &&
      !data.verification.autoCriteria.trim()
    ) {
      errors.push({
        field: 'verification.autoCriteria',
        message: 'Auto verification criteria are required.',
      });
    }
  }

  if (step === 5) {
    for (let s = 0; s <= 4; s += 1) {
      const stepErrors = validateStep(s as QuestWizardStepIndex, data);
      errors.push(...stepErrors);
    }
  }

  return errors;
}

export function getFieldError(
  errors: ValidationError[],
  field: string
): string | undefined {
  return errors.find((error) => error.field === field)?.message;
}

export function sanitizeWizardData(data: QuestWizardData): QuestWizardData {
  return {
    basics: {
      ...data.basics,
      title: data.basics.title.trim(),
      shortDescription: data.basics.shortDescription.trim(),
      description: extractPlainTextFromHtml(data.basics.description)
        ? data.basics.description.trim()
        : '',
    },
    requirements: {
      skills: data.requirements.skills
        .map((skill) => skill.trim())
        .filter(Boolean),
      deliverables: data.requirements.deliverables
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          details: item.details.trim(),
        }))
        .filter((item) => item.title.length > 0),
    },
    reward: {
      amount: Number(data.reward.amount),
      assetType: data.reward.assetType,
      xpReward: Number(data.reward.xpReward),
    },
    timeline: {
      ...data.timeline,
      milestones: data.timeline.milestones
        .map((item) => ({
          ...item,
          title: item.title.trim(),
        }))
        .filter((item) => item.title.length > 0),
    },
    verification: {
      ...data.verification,
      instructions: data.verification.instructions.trim(),
      autoCriteria: data.verification.autoCriteria.trim(),
    },
    advanced: {
      difficulty: data.advanced.difficulty,
      maxParticipants: Number(data.advanced.maxParticipants),
      tags: Array.from(
        new Set(
          data.advanced.tags
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean)
        )
      ),
    },
  };
}

/**
 * Flattens wizard data into the shape the admin quest API expects.
 *
 * The admin endpoint takes a single flat form payload rather than the
 * `CreateQuestRequest` used by the public endpoint, so the admin entry point
 * converts here instead of maintaining a second creation UI.
 */
export function questWizardDataToFormData(data: QuestWizardData): {
  title: string;
  description: string;
  shortDescription: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  reward: number;
  xpReward: number;
  deadline: string;
  maxParticipants: number;
  requirements: string[];
  tags: string[];
} {
  const requirements = [
    ...data.requirements.skills.map((skill) => `Skill: ${skill}`),
    ...data.requirements.deliverables.map(
      (item) =>
        `Deliverable: ${item.title}${item.details ? ` (${item.details})` : ''}${
          item.required ? ' [required]' : ''
        }`
    ),
  ];

  return {
    title: data.basics.title,
    description: data.basics.description,
    shortDescription: data.basics.shortDescription,
    category: data.basics.category,
    difficulty: data.advanced.difficulty,
    reward: data.reward.amount,
    xpReward: data.reward.xpReward,
    deadline: data.timeline.deadline
      ? (zonedDateTimeToIso(data.timeline.deadline, data.timeline.timezone) ??
        '')
      : '',
    maxParticipants: data.advanced.maxParticipants,
    requirements,
    tags: data.advanced.tags,
  };
}
