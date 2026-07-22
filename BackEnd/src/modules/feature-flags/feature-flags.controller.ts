import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Logger,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { SkipLogging } from '../../common/interceptors/logging.interceptor';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  private readonly logger = new Logger(FeatureFlagsController.name);

  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @SkipLogging()
  @ApiOperation({
    summary: 'Get all feature flags',
    description:
      'Returns all feature flags with their current status and configurations.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all feature flags',
  })
  async getAllFlags() {
    this.logger.debug('Getting all feature flags');
    const flags = await this.featureFlagsService.findAll();
    return {
      flags,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @SkipLogging()
  @ApiOperation({
    summary: 'Get specific feature flag by ID',
    description: 'Returns details of a specific feature flag by ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag details',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async getFlag(@Param('id') id: string) {
    this.logger.debug(`Getting feature flag: ${id}`);
    const flag = await this.featureFlagsService.findOne(id);
    return {
      flag,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('key/:key')
  @SkipLogging()
  @ApiOperation({
    summary: 'Get specific feature flag by key',
    description: 'Returns details of a specific feature flag by key.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag details',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async getFlagByKey(@Param('key') key: string) {
    this.logger.debug(`Getting feature flag by key: ${key}`);
    const flag = await this.featureFlagsService.findByKey(key);
    return {
      flag,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':key/check')
  @SkipLogging()
  @ApiOperation({
    summary: 'Check if feature flag is enabled',
    description:
      'Returns whether a specific feature flag is enabled for the current user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag status',
  })
  async checkFlag(@Param('key') key: string, @Req() req?: any) {
    this.logger.debug(`Checking feature flag: ${key}`);
    const userId = req?.user?.id;
    const userContext = req?.user
      ? {
          role: req.user.role,
          level: req.user.level,
          xp: req.user.xp,
        }
      : undefined;

    const enabled = await this.featureFlagsService.isEnabled(
      key,
      userId,
      userContext,
    );

    return {
      flagKey: key,
      enabled,
      userId,
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new feature flag',
    description: 'Creates a new feature flag with the specified configuration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Feature flag created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or flag already exists',
  })
  async createFlag(@Body() createDto: CreateFeatureFlagDto, @Req() req: any) {
    this.logger.debug(`Creating feature flag: ${createDto.key}`);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const flag = await this.featureFlagsService.create(
      createDto,
      req.user.id,
      ipAddress,
      createDto.metadata?.reason,
    );

    return {
      flag,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a feature flag',
    description: 'Updates an existing feature flag with new configuration.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async updateFlag(
    @Param('id') id: string,
    @Body() updateDto: UpdateFeatureFlagDto,
    @Req() req: any,
  ) {
    this.logger.debug(`Updating feature flag: ${id}`);
    const ipAddress = req.ip || req.connection.remoteAddress;
    const flag = await this.featureFlagsService.update(
      id,
      updateDto,
      req.user.id,
      ipAddress,
      updateDto.metadata?.reason,
    );

    return {
      flag,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete a feature flag',
    description: 'Deletes an existing feature flag.',
  })
  @ApiResponse({
    status: 200,
    description: 'Feature flag deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async deleteFlag(@Param('id') id: string, @Req() req: any) {
    this.logger.debug(`Deleting feature flag: ${id}`);
    const ipAddress = req.ip || req.connection.remoteAddress;
    await this.featureFlagsService.delete(id, req.user.id, ipAddress);

    return {
      message: 'Feature flag deleted successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id/audit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get audit logs for a feature flag',
    description: 'Returns the audit history for a specific feature flag.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs',
  })
  @ApiResponse({
    status: 404,
    description: 'Feature flag not found',
  })
  async getAuditLogs(@Param('id') id: string) {
    this.logger.debug(`Getting audit logs for flag: ${id}`);
    const logs = await this.featureFlagsService.getAuditLogs(id);

    return {
      logs,
      timestamp: new Date().toISOString(),
    };
  }
}
