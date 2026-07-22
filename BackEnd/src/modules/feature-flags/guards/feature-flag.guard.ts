import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../feature-flags.service';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!flagKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const userContext = request.user
      ? {
          role: request.user.role,
          level: request.user.level,
          xp: request.user.xp,
        }
      : undefined;

    const isEnabled = await this.featureFlagsService.isEnabled(
      flagKey,
      userId,
      userContext,
    );

    if (!isEnabled) {
      this.logger.warn(
        `Feature flag "${flagKey}" is disabled for user ${userId}`,
      );
      throw new ForbiddenException(`This feature is currently not available`);
    }

    return true;
  }
}
