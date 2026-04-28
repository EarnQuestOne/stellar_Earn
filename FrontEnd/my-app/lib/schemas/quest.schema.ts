export type QuestCategory =
  | 'Development'
  | 'Blockchain'
  | 'Documentation'
  | 'Design'
  | 'Testing'
  | 'Community';

export type RewardAssetType = 'XLM' | 'USDC' | 'AQUA' | 'yXLM';

export type VerificationMode = 'auto' | 'manual';

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
}

export const QUEST_CATEGORIES: QuestCategory[] = [
  'Development',
  'Blockchain',
  'Documentation',
  'Design',
  'Testing',
  'Community',
];

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

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function parseDateTimeParts(value: string): DateTimeParts | null {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second ?? '0'),
  };
}

function getFormatter(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
}

export function zonedDateTimeToIso(
  value: string,
  timezone: string
): string | null {
  const parts = parseDateTimeParts(value);
  if (!parts) {
    return null;
  }

  if (timezone === 'UTC') {
    return new Date(
      Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second
      )
    ).toISOString();
  }

  let formatter: Intl.DateTimeFormat;
  try {
    formatter = getFormatter(timezone);
  } catch {
    return null;
  }

  let timestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  const targetTimestamp = timestamp;

  for (let index = 0; index < 3; index += 1) {
    const formattedParts = formatter.formatToParts(new Date(timestamp));
    const current = {
      year: Number(
        formattedParts.find((part) => part.type === 'year')?.value ?? '0'
      ),
      month: Number(
        formattedParts.find((part) => part.type === 'month')?.value ?? '0'
      ),
      day: Number(
        formattedParts.find((part) => part.type === 'day')?.value ?? '0'
      ),
      hour: Number(
        formattedParts.find((part) => part.type === 'hour')?.value ?? '0'
      ),
      minute: Number(
        formattedParts.find((part) => part.type === 'minute')?.value ?? '0'
      ),
      second: Number(
        formattedParts.find((part) => part.type === 'second')?.value ?? '0'
      ),
    };

    const currentTimestamp = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second
    );
    const diff = targetTimestamp - currentTimestamp;

    if (diff === 0) {
      break;
    }

    timestamp += diff;
  }

  const result = new Date(timestamp);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

export function formatWizardDateTime(value: string, timezone: string): string {
  const isoValue = zonedDateTimeToIso(value, timezone);
  if (!isoValue) {
    return value || 'Not set';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone,
    }).format(new Date(isoValue));
  } catch {
    return new Date(isoValue).toLocaleString();
  }
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
  };
}
