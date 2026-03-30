import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { API_VERSION_CONFIG, extractApiVersion, isVersionSupported } from '../../config/versioning.config';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const version = extractApiVersion(request) || API_VERSION_CONFIG.defaultVersion;

    if (!isVersionSupported(version)) {
      throw new BadRequestException(`API version '${version}' is not supported`);
    }

    return true;
  }
}
