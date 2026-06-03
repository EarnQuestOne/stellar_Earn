import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: this.formatErrors(errors),
      });
    }

    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
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
