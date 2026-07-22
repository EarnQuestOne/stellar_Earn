import { ValidationError } from 'class-validator';

/**
 * Utility functions for validation operations
 */

export class ValidationUtils {
  /**
   * Format validation errors into a flat object structure
   */
  static formatValidationErrors(
    errors: ValidationError[],
  ): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    const flattenErrors = (errs: ValidationError[], parentPath = '') => {
      errs.forEach((error) => {
        const currentPath = parentPath
          ? `${parentPath}.${error.property}`
          : error.property;

        if (error.constraints) {
          formattedErrors[currentPath] = Object.values(error.constraints);
        }

        if (error.children && error.children.length > 0) {
          flattenErrors(error.children, currentPath);
        }
      });
    };

    flattenErrors(errors);
    return formattedErrors;
  }

  /**
   * Check if a value is a valid Stellar public key
   */
  static isValidStellarAddress(address: string): boolean {
    if (typeof address !== 'string') return false;
    if (address.length !== 56) return false;
    if (!address.startsWith('G')) return false;

    // Basic format check - alphanumeric excluding 0, O, I, l
    const stellarFormat = /^[GABCEHIJLMNOPQRSTUVXYZ123456789]{56}$/;
    return stellarFormat.test(address);
  }

  /**
   * Check if a value is a valid proof hash
   * Supports SHA-256, IPFS CID, and Arweave transaction IDs
   */
  static isValidProofHash(hash: string): boolean {
    if (typeof hash !== 'string') return false;

    // SHA-256 hash (64 hex characters)
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    if (sha256Regex.test(hash)) return true;

    // IPFS CID (starts with Qm and is base58 encoded)
    const ipfsCidRegex = /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/;
    if (ipfsCidRegex.test(hash)) return true;

    // Arweave transaction ID (43 base64url characters)
    const arweaveTxRegex = /^[a-zA-Z0-9_-]{43}$/;
    if (arweaveTxRegex.test(hash)) return true;

    return false;
  }

  /**
   * Sanitize string input by removing potentially harmful characters
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return input;

    return (
      input
        // Remove NULL bytes
        .replace(/\0/g, '')
        // Remove control characters except tab, newline, carriage return
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Remove HTML tags (basic protection)
        .replace(/<[^>]*>/g, '')
        // Decode HTML entities
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        // Trim whitespace
        .trim()
    );
  }

  /**
   * Validate array with size constraints
   */
  static validateArraySize<T>(
    array: T[],
    minSize?: number,
    maxSize?: number,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(array)) {
      return { isValid: false, errors: ['Must be an array'] };
    }

    if (minSize !== undefined && array.length < minSize) {
      errors.push(`Array must have at least ${minSize} elements`);
    }

    if (maxSize !== undefined && array.length > maxSize) {
      errors.push(`Array must have at most ${maxSize} elements`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if array contains only unique elements
   */
  static isArrayUnique<T>(array: T[]): boolean {
    if (!Array.isArray(array)) return false;

    // For primitive types, use Set
    if (array.every((item) => typeof item !== 'object')) {
      return new Set(array).size === array.length;
    }

    // For objects, check by JSON string representation
    const seen = new Set();
    for (const item of array) {
      const itemStr = JSON.stringify(item);
      if (seen.has(itemStr)) {
        return false;
      }
      seen.add(itemStr);
    }
    return true;
  }

  /**
   * Validate that all array elements pass a predicate function
   */
  static validateArrayElements<T>(
    array: T[],
    predicate: (item: T) => boolean,
    errorMessage: string = 'Invalid array element',
  ): { isValid: boolean; errors: string[] } {
    if (!Array.isArray(array)) {
      return { isValid: false, errors: ['Must be an array'] };
    }

    const errors: string[] = [];
    array.forEach((item, index) => {
      if (!predicate(item)) {
        errors.push(`${errorMessage} at index ${index}`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Conditional validation helper
   */
  static requiredIf<T>(
    value: T,
    condition: boolean,
    fieldName: string,
  ): { isValid: boolean; error?: string } {
    if (condition && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true };
  }

  /**
   * Validate that two fields match
   */
  static fieldsMatch<T>(
    value1: T,
    value2: T,
    fieldName1: string,
    fieldName2: string,
  ): { isValid: boolean; error?: string } {
    if (value1 !== value2) {
      return {
        isValid: false,
        error: `${fieldName1} must match ${fieldName2}`,
      };
    }
    return { isValid: true };
  }

  /**
   * Create a comprehensive validation result
   */
  static createValidationResult(
    validations: Array<{ isValid: boolean; error?: string }>,
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    validations.forEach((validation) => {
      if (!validation.isValid && validation.error) {
        errors.push(validation.error);
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}
