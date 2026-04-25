import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import {
  detectSecurityIssues,
  isDangerousKey,
  sanitizeObjectDeep,
  sanitizePrimitiveString,
} from '../utils/security.utils';

/**
 * Enhanced Sanitization Pipe for input validation and XSS prevention
 * Provides comprehensive sanitization for all incoming request data
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly logger = new Logger(SanitizationPipe.name);

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;
    const issues = detectSecurityIssues(value);
    if (issues.length > 0) {
      this.logger.warn(
        `Potentially dangerous ${metadata.type || 'unknown'} input detected: ${issues
          .map((issue) => issue.category)
          .join(', ')}`,
      );
    }

    return sanitizeObjectDeep(value, 0, 10);
  }

  private sanitizeString(str: string): string {
    return sanitizePrimitiveString(str);
  }

  private isDangerousKey(key: string): boolean {
    return isDangerousKey(key);
  }

  private containsDangerousPatterns(str: string): boolean {
    return detectSecurityIssues(str).length > 0;
  }
}
