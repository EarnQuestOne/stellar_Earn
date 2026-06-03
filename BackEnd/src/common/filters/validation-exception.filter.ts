import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { Response } from 'express';
import { Logger } from '@nestjs/common';

@Catch()
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors = {};

    // Handle validation errors from class-validator
    if (exception.name === 'BadRequestException' && exception.getResponse) {
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'object' && errorResponse !== null) {
        status = HttpStatus.BAD_REQUEST;
        message = (errorResponse as any).message || 'Validation failed';
        errors = (errorResponse as any).errors || {};
      }
    }

    // Handle raw validation errors
    if (
      Array.isArray(exception) &&
      exception.length > 0 &&
      exception[0] instanceof ValidationError
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = this.formatValidationErrors(exception);
    }

    // Log the validation error
    this.logger.warn({
      message: 'Validation error occurred',
      url: request.url,
      method: request.method,
      errors,
      stack: exception.stack,
    });

    response.status(status).json({
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private formatValidationErrors(errors: ValidationError[]): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    const flattenErrors = (
      errs: ValidationError[],
      parentProperty?: string,
    ) => {
      errs.forEach((error) => {
        const propertyPath = parentProperty
          ? `${parentProperty}.${error.property}`
          : error.property;

        if (error.constraints) {
          formattedErrors[propertyPath] = Object.values(error.constraints);
        }

        if (error.children && error.children.length > 0) {
          flattenErrors(error.children, propertyPath);
        }
      });
    };

    flattenErrors(errors);
    return formattedErrors;
  }
}
