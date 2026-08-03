import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Field-selection (sparse fieldsets) pipe.
 *
 * Reads a `fields` query parameter (comma-separated field names) and stores
 * the allowed set on the request object as `__allowedFields`.  Downstream
 * code (controllers / interceptors) can then prune response DTOs to include
 * only the requested fields.
 *
 * Usage:  GET /quests?fields=id,title,status
 */
@Injectable()
export class FieldSelectionPipe implements PipeTransform {
  transform(value: any, { type }: ArgumentMetadata): any {
    if (type !== 'query') return value;

    const fieldsParam = (value as any)?.fields;
    if (typeof fieldsParam !== 'string' || !fieldsParam.trim()) return value;

    const allowedFields = new Set(
      fieldsParam
        .split(',')
        .map((f: string) => f.trim())
        .filter(Boolean),
    );

    // Attach to the query object so controllers / interceptors can read it.
    (value as any).__allowedFields = allowedFields;
    return value;
  }
}

/**
 * Helper: prune an object to only the fields in `allowedFields`.
 * If `allowedFields` is undefined, returns the original object.
 */
export function applyFieldSelection<T extends Record<string, any>>(
  obj: T,
  allowedFields?: Set<string>,
): Partial<T> {
  if (!allowedFields || allowedFields.size === 0) return obj;

  const result: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result as Partial<T>;
}
