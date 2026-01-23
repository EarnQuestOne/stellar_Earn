import type { QuestFormData, QuestCategory, QuestDifficulty } from '../types/admin';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

const VALID_CATEGORIES: QuestCategory[] = [
  'Development',
  'Blockchain',
  'Documentation',
  'Design',
  'Testing',
  'Community',
];

const VALID_DIFFICULTIES: QuestDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

export function validateQuestForm(data: Partial<QuestFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (data.title.length < 5) {
    errors.push({ field: 'title', message: 'Title must be at least 5 characters' });
  } else if (data.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be less than 100 characters' });
  }

  // Short description validation
  if (!data.shortDescription || data.shortDescription.trim().length === 0) {
    errors.push({ field: 'shortDescription', message: 'Short description is required' });
  } else if (data.shortDescription.length > 200) {
    errors.push({ field: 'shortDescription', message: 'Short description must be less than 200 characters' });
  }

  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Description is required' });
  } else if (data.description.length < 20) {
    errors.push({ field: 'description', message: 'Description must be at least 20 characters' });
  }

  // Category validation
  if (!data.category) {
    errors.push({ field: 'category', message: 'Category is required' });
  } else if (!VALID_CATEGORIES.includes(data.category)) {
    errors.push({ field: 'category', message: 'Invalid category selected' });
  }

  // Difficulty validation
  if (!data.difficulty) {
    errors.push({ field: 'difficulty', message: 'Difficulty is required' });
  } else if (!VALID_DIFFICULTIES.includes(data.difficulty)) {
    errors.push({ field: 'difficulty', message: 'Invalid difficulty selected' });
  }

  // Reward validation
  if (data.reward === undefined || data.reward === null) {
    errors.push({ field: 'reward', message: 'Reward is required' });
  } else if (data.reward < 0) {
    errors.push({ field: 'reward', message: 'Reward cannot be negative' });
  } else if (data.reward > 10000) {
    errors.push({ field: 'reward', message: 'Reward cannot exceed 10,000 XLM' });
  }

  // XP Reward validation
  if (data.xpReward === undefined || data.xpReward === null) {
    errors.push({ field: 'xpReward', message: 'XP reward is required' });
  } else if (data.xpReward < 0) {
    errors.push({ field: 'xpReward', message: 'XP reward cannot be negative' });
  } else if (data.xpReward > 5000) {
    errors.push({ field: 'xpReward', message: 'XP reward cannot exceed 5,000' });
  }

  // Deadline validation
  if (!data.deadline) {
    errors.push({ field: 'deadline', message: 'Deadline is required' });
  } else {
    const deadlineDate = new Date(data.deadline);
    const now = new Date();
    if (isNaN(deadlineDate.getTime())) {
      errors.push({ field: 'deadline', message: 'Invalid deadline date' });
    } else if (deadlineDate <= now) {
      errors.push({ field: 'deadline', message: 'Deadline must be in the future' });
    }
  }

  // Max participants validation
  if (data.maxParticipants === undefined || data.maxParticipants === null) {
    errors.push({ field: 'maxParticipants', message: 'Max participants is required' });
  } else if (data.maxParticipants < 1) {
    errors.push({ field: 'maxParticipants', message: 'Must allow at least 1 participant' });
  } else if (data.maxParticipants > 10000) {
    errors.push({ field: 'maxParticipants', message: 'Cannot exceed 10,000 participants' });
  }

  // Requirements validation (optional but if provided, validate)
  if (data.requirements && data.requirements.length > 0) {
    const emptyRequirements = data.requirements.filter(r => !r || r.trim().length === 0);
    if (emptyRequirements.length > 0) {
      errors.push({ field: 'requirements', message: 'Requirements cannot be empty' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  const error = errors.find(e => e.field === field);
  return error?.message;
}

export function sanitizeQuestData(data: QuestFormData): QuestFormData {
  return {
    ...data,
    title: data.title.trim(),
    description: data.description.trim(),
    shortDescription: data.shortDescription.trim(),
    requirements: data.requirements.filter(r => r && r.trim().length > 0).map(r => r.trim()),
    tags: data.tags.filter(t => t && t.trim().length > 0).map(t => t.trim().toLowerCase()),
  };
}
