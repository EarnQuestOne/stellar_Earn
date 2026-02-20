import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { Logger } from '@nestjs/common';

/**
 * Enhanced Sanitization Pipe for input validation and XSS prevention
 * Provides comprehensive sanitization for all incoming request data
 */
@Injectable()
export class SanitizationPipe implements PipeTransform {
  private readonly logger = new Logger(SanitizationPipe.name);

  transform(value: any, metadata: ArgumentMetadata) {
    if (!value) return value;

    // Handle different data types
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (typeof value === 'object') {
      const sanitized = {};
      for (const [key, val] of Object.entries(value)) {
        // Prevent prototype pollution
        if (this.isDangerousKey(key)) {
          this.logger.warn(`Blocked dangerous key: ${key}`);
          continue;
        }
        sanitized[key] = this.transform(val, metadata);
      }
      return sanitized;
    }

    return value;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    // Log if we detect potentially malicious content
    if (this.containsDangerousPatterns(str)) {
      this.logger.warn(`Potentially dangerous input detected: ${str.substring(0, 100)}...`);
    }

    return (
      str
        // Remove NULL bytes
        .replace(/\0/g, '')
        // Remove control characters except tab, newline, carriage return
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove HTML tags (basic protection)
        .replace(/<[^>]*>/g, '')
        // Prevent javascript protocol
        .replace(/javascript:/gi, 'javascript_disabled:')
        // Prevent data protocol (except images)
        .replace(/((?!data:image\/)[^\s])*data:(?!image\/)[^\s]*/gi, 'data_disabled:')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        // Remove SQL injection patterns (basic protection)
        .replace(/\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi, '')
        // Remove common XSS vectors
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/src\s*=\s*javascript:/gi, 'src="javascript_disabled:"')
        // Trim whitespace
        .trim()
    );
  }

  private isDangerousKey(key: string): boolean {
    const dangerousKeys = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
    ];
    
    return dangerousKeys.some(dangerousKey => 
      key.toLowerCase().includes(dangerousKey.toLowerCase())
    );
  }

  private containsDangerousPatterns(str: string): boolean {
    const dangerousPatterns = [
      /<script.*?>.*?<\/script>/gi,
      /on\w+\s*=\s*["'][^"']*["']/gi,
      /javascript:/gi,
      /data:(?!image\/)/gi,
      /\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi,
      /\.\.[\/\\]/g,
      /\$\{.*?\}/g,
      /\{\{.*?\}\}/g,
    ];

    return dangerousPatterns.some(pattern => pattern.test(str));
  }
}
