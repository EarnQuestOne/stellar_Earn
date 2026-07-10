import {
  Injectable,
  NestMiddleware,
  PayloadTooLargeException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { json, urlencoded } from 'express';
import { BODY_SIZE_LIMIT_KEY, BodySizeLimitOptions } from '../decorators/body-size-limit.decorator';

@Injectable()
export class BodySizeLimitMiddleware implements NestMiddleware {
  private readonly defaultJsonLimit = '1mb';
  private readonly defaultUrlencodedLimit = '256kb';

  // Cache parser instances per limit config to avoid recreating
  private readonly jsonParsers = new Map<string, ReturnType<typeof json>>();
  private readonly urlencodedParsers = new Map<string, ReturnType<typeof urlencoded>>();

  constructor(private readonly reflector: Reflector) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Get the controller class from the route
    const controllerClass = (req as any).__controllerClass;

    let limits: BodySizeLimitOptions = {
      json: this.defaultJsonLimit,
      urlencoded: this.defaultUrlencodedLimit,
    };

    if (controllerClass) {
      const controllerLimits = this.reflector.get<BodySizeLimitOptions>(
        BODY_SIZE_LIMIT_KEY,
        controllerClass,
      );
      if (controllerLimits) {
        limits = {
          json: controllerLimits.json ?? this.defaultJsonLimit,
          urlencoded: controllerLimits.urlencoded ?? this.defaultUrlencodedLimit,
        };
      }
    }

    const jsonParser = this.getJsonParser(limits.json!);
    const urlencodedParser = this.getUrlencodedParser(limits.urlencoded!);

    // Run JSON parser first, then urlencoded
    jsonParser(req, res, (jsonErr?: any) => {
      if (jsonErr) {
        if (jsonErr.type === 'entity.too.large') {
          return next(new PayloadTooLargeException(
            `Request body exceeds ${limits.json} limit`,
          ));
        }
        return next(jsonErr);
      }
      urlencodedParser(req, res, (urlErr?: any) => {
        if (urlErr) {
          if (urlErr.type === 'entity.too.large') {
            return next(new PayloadTooLargeException(
              `Request body exceeds ${limits.urlencoded} limit`,
            ));
          }
          return next(urlErr);
        }
        next();
      });
    });
  }

  private getJsonParser(limit: string): ReturnType<typeof json> {
    if (!this.jsonParsers.has(limit)) {
      this.jsonParsers.set(limit, json({ limit }));
    }
    return this.jsonParsers.get(limit)!;
  }

  private getUrlencodedParser(limit: string): ReturnType<typeof urlencoded> {
    if (!this.urlencodedParsers.has(limit)) {
      this.urlencodedParsers.set(limit, urlencoded({ extended: true, limit }));
    }
    return this.urlencodedParsers.get(limit)!;
  }
}