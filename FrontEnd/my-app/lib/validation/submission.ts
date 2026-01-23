export type ProofType = 'link' | 'file' | 'text';

export interface SubmissionFormData {
  questId: string;
  proofType: ProofType;
  link?: string;
  text?: string;
  file?: File | null;
  additionalNotes?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// File size limit: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/json',
  'video/mp4',
  'video/webm',
];

const ALLOWED_FILE_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.txt',
  '.json',
  '.mp4',
  '.webm',
];

// URL pattern for link validation
const URL_PATTERN = /^https?:\/\/.+\..+/i;

export function validateSubmissionForm(data: Partial<SubmissionFormData>): ValidationResult {
  const errors: ValidationError[] = [];

  // Quest ID validation
  if (!data.questId || data.questId.trim().length === 0) {
    errors.push({ field: 'questId', message: 'Quest ID is required' });
  }

  // Proof type validation
  if (!data.proofType) {
    errors.push({ field: 'proofType', message: 'Please select a proof type' });
  } else if (!['link', 'file', 'text'].includes(data.proofType)) {
    errors.push({ field: 'proofType', message: 'Invalid proof type selected' });
  }

  // Validate based on proof type
  if (data.proofType === 'link') {
    if (!data.link || data.link.trim().length === 0) {
      errors.push({ field: 'link', message: 'Link is required' });
    } else if (!URL_PATTERN.test(data.link.trim())) {
      errors.push({ field: 'link', message: 'Please enter a valid URL (starting with http:// or https://)' });
    } else if (data.link.length > 2000) {
      errors.push({ field: 'link', message: 'Link is too long (max 2000 characters)' });
    }
  }

  if (data.proofType === 'text') {
    if (!data.text || data.text.trim().length === 0) {
      errors.push({ field: 'text', message: 'Proof text is required' });
    } else if (data.text.trim().length < 10) {
      errors.push({ field: 'text', message: 'Proof text must be at least 10 characters' });
    } else if (data.text.length > 5000) {
      errors.push({ field: 'text', message: 'Proof text is too long (max 5000 characters)' });
    }
  }

  if (data.proofType === 'file') {
    if (!data.file) {
      errors.push({ field: 'file', message: 'Please upload a file' });
    } else {
      const fileErrors = validateFile(data.file);
      errors.push(...fileErrors);
    }
  }

  // Additional notes validation (optional field)
  if (data.additionalNotes && data.additionalNotes.length > 1000) {
    errors.push({ field: 'additionalNotes', message: 'Additional notes are too long (max 1000 characters)' });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateFile(file: File): ValidationError[] {
  const errors: ValidationError[] = [];

  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    errors.push({
      field: 'file',
      message: `File is too large (${sizeMB}MB). Maximum size is 10MB`,
    });
  }

  // File type validation
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isValidType = ALLOWED_FILE_TYPES.includes(file.type) ||
    ALLOWED_FILE_EXTENSIONS.includes(fileExtension);

  if (!isValidType) {
    errors.push({
      field: 'file',
      message: `File type not allowed. Supported types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
    });
  }

  return errors;
}

export function validateLink(url: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!url || url.trim().length === 0) {
    errors.push({ field: 'link', message: 'Link is required' });
  } else if (!URL_PATTERN.test(url.trim())) {
    errors.push({ field: 'link', message: 'Please enter a valid URL' });
  }

  return errors;
}

export function getFieldError(errors: ValidationError[], field: string): string | undefined {
  const error = errors.find(e => e.field === field);
  return error?.message;
}

export function sanitizeSubmissionData(data: SubmissionFormData): SubmissionFormData {
  return {
    ...data,
    link: data.link?.trim(),
    text: data.text?.trim(),
    additionalNotes: data.additionalNotes?.trim(),
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}

export { MAX_FILE_SIZE, ALLOWED_FILE_TYPES, ALLOWED_FILE_EXTENSIONS };
