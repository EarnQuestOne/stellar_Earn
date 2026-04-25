import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  QuestNotFoundException,
  QuestAlreadyExistsException,
  QuestExpiredException,
  SubmissionNotFoundException,
  SubmissionAlreadyExistsException,
  UnauthorizedActionException,
  InsufficientFundsException,
  InvalidStellarAddressException,
  PayoutFailedException,
  UserNotFoundException,
} from '../exceptions/app.exceptions';

const APP_EXCEPTIONS = [
  QuestNotFoundException,
  QuestAlreadyExistsException,
  QuestExpiredException,
  SubmissionNotFoundException,
  SubmissionAlreadyExistsException,
  UnauthorizedActionException,
  InsufficientFundsException,
  InvalidStellarAddressException,
  PayoutFailedException,
  UserNotFoundException,
];

@Catch(...APP_EXCEPTIONS)
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const message = exception.message;

    this.logger.warn(
      `[${exception.constructor.name}] ${message} | ${request.method} ${request.originalUrl}`,
    );

    response.status(status).json({
      statusCode: status,
      error: exception.constructor.name,
      message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
