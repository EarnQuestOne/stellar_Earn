import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * Custom validation pipe that enforces strict DTO whitelisting for all write
 * endpoints (POST, PUT, PATCH).
 *
 * - `whitelist: true` — strips any properties that are not decorated with a
 *   class-validator decorator, so they never reach the service layer.
 * - `forbidNonWhitelisted: true` — instead of silently stripping unknown
 *   properties, the pipe rejects the entire request with a 400 Bad Request,
 *   making injection of unauthorised fields immediately visible to callers
 *   and surfaced in logs.
 *
 * These options mirror the global `ValidationPipe` configured in `main.ts`.
 * Applying them here as well ensures whitelisting is enforced at the
 * `CustomValidationPipe` stage before the global pipe runs.
 */
@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: this.formatErrors(errors),
      });
    }

    // Return the transformed (and now whitelisted) object so that any
    // properties not covered by a decorator have already been stripped.
    return object;
  }

  private toValidate(metatype: new (...args: any[]) => any): boolean {
    const types: (new (...args: any[]) => any)[] = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(errors: any[]): Record<string, any> {
    const formattedErrors: Record<string, any> = {};

    errors.forEach((error) => {
      if (error.constraints) {
        formattedErrors[error.property] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        formattedErrors[error.property] = this.formatErrors(error.children);
      }
    });

    return formattedErrors;
  }
}
