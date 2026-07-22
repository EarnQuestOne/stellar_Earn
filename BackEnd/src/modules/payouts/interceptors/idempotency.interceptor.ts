import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { IdempotencyService } from '../services/idempotency.service';
import { IDEMPOTENT_KEY } from '../decorators/idempotent.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isIdempotent = this.reflector.getAllAndOverride<boolean>(
      IDEMPOTENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isIdempotent) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.method !== 'POST') {
      return next.handle();
    }

    const clientKey = (request.headers['idempotency-key'] as string) || null;
    const fingerprint = this.idempotencyService.computeFingerprint(
      request.method,
      request.originalUrl || request.url,
      (request.body as Record<string, unknown>) || {},
    );
    const bodyHash = this.idempotencyService.computeBodyHash(
      (request.body as Record<string, unknown>) || {},
    );

    const effectiveKey = clientKey ?? fingerprint;

    return from(this.idempotencyService.findByKey(effectiveKey)).pipe(
      switchMap((existingRecord) => {
        if (existingRecord) {
          if (
            existingRecord.requestBodyHash &&
            existingRecord.requestBodyHash !== bodyHash
          ) {
            return throwError(
              () =>
                new ConflictException(
                  'Idempotency key used with a different request body',
                ),
            );
          }

          if (existingRecord.locked) {
            return throwError(
              () => new ConflictException('Request is already being processed'),
            );
          }

          if (
            existingRecord.responseStatusCode &&
            existingRecord.responseBody
          ) {
            response.statusCode = existingRecord.responseStatusCode;
            response.setHeader('X-Idempotency-Replay', 'true');
            return of(existingRecord.responseBody);
          }
        }

        return from(
          this.idempotencyService.tryAcquire(
            effectiveKey,
            fingerprint,
            request.method,
            request.originalUrl || request.url,
            bodyHash,
          ),
        ).pipe(
          switchMap((result) => {
            if (!result.acquired && result.existing) {
              if (result.existing.locked) {
                return throwError(
                  () =>
                    new ConflictException('Request is already being processed'),
                );
              }

              if (
                result.existing.responseStatusCode &&
                result.existing.responseBody
              ) {
                response.statusCode = result.existing.responseStatusCode;
                response.setHeader('X-Idempotency-Replay', 'true');
                return of(result.existing.responseBody);
              }
            }

            return next.handle().pipe(
              tap((responseBody: unknown) => {
                if (responseBody !== undefined) {
                  response.setHeader('X-Idempotency-Key', effectiveKey);
                  void this.idempotencyService.complete(
                    effectiveKey,
                    response.statusCode,
                    responseBody,
                  );
                }
              }),
              catchError((error) => {
                if (error instanceof HttpException) {
                  void this.idempotencyService.complete(
                    effectiveKey,
                    error.getStatus(),
                    { error: error.message },
                  );
                }
                return throwError(() => error);
              }),
            );
          }),
        );
      }),
    );
  }
}
