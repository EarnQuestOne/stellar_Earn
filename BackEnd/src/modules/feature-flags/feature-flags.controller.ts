import { Controller, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FeatureFlagsService } from '../../common/services/feature-flags.service';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Get all feature flags',
    description: 'Returns all feature flags with their current status and descriptions.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all feature flags',
  })
  getAllFlags() {
    this.logger.debug('Getting all feature flags');
    return {
      flags: this.featureFlagsService.getAllFlags(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':flagName')
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Get specific feature flag',
    description: 'Returns details of a specific feature flag.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Feature flag details',
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Feature flag not found',
  })
  getFlag(@Param('flagName') flagName: string) {
    this.logger.debug(`Getting feature flag: ${flagName}`);
    const flag = this.featureFlagsService.getFlag(flagName);
    
    if (!flag) {
      return {
        error: 'Feature flag not found',
        flagName,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      flag,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':flagName/check')
  @SkipLogging()
  @ApiOperation({ 
    summary: 'Check if feature flag is enabled',
    description: 'Returns whether a specific feature flag is enabled.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Feature flag status',
  })
  checkFlag(@Param('flagName') flagName: string) {
    this.logger.debug(`Checking feature flag: ${flagName}`);
    const enabled = this.featureFlagsService.isEnabled(flagName);
    
    return {
      flagName,
      enabled,
      timestamp: new Date().toISOString(),
    };
  }
}
