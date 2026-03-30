import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  API_VERSION_CONFIG,
  extractApiVersion,
  getVersionDeprecationInfo,
  isVersionDeprecated,
} from '../../config/versioning.config';
import { API_VERSION_METADATA_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class VersioningInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const resolvedVersion = extractApiVersion(request) ?? API_VERSION_CONFIG.defaultVersion;

    response.setHeader('X-API-Version', resolvedVersion);
    response.setHeader('Vary', 'Accept, X-API-Version');

    const routeMetadata =
      this.reflector.getAllAndOverride<Record<string, unknown>>(API_VERSION_METADATA_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    let deprecationInfo = getVersionDeprecationInfo(resolvedVersion);

    if (routeMetadata['deprecated']) {
      deprecationInfo = {
        sunset: (routeMetadata['sunset'] as string) || deprecationInfo?.sunset,
        sunsetLink: (routeMetadata['sunsetLink'] as string) || deprecationInfo?.sunsetLink,
        reason: (routeMetadata['reason'] as string) || deprecationInfo?.reason,
      };
    }

    if (isVersionDeprecated(resolvedVersion) || routeMetadata['deprecated']) {
      response.setHeader('Deprecation', 'true');
      if (deprecationInfo?.sunset) {
        response.setHeader('Sunset', deprecationInfo.sunset);

        if (deprecationInfo.sunsetLink) {
          response.setHeader('Link', `<${deprecationInfo.sunsetLink}>; rel=\"sunset\"`);
        }
      }

      const warningMessage = `299 - \"Deprecated API version ${resolvedVersion}; ${
        deprecationInfo?.reason || 'Please migrate to a newer API version.'
      }\"`;
      response.setHeader('Warning', warningMessage);
    }

    return next.handle();
  }
}
