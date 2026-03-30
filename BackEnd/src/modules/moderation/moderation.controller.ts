import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import {
  ScanTextDto,
  ApplyModerationActionDto,
  CreateAppealDto,
  ResolveAppealDto,
  ModerationDashboardQueryDto,
} from './dto/moderation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('scan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run automated text scan (classification + keywords)' })
  @ApiResponse({ status: 200, description: 'Scan result' })
  async scan(@Body() dto: ScanTextDto) {
    const result = await this.moderationService.scanText(dto.text);
    return { success: true, data: result };
  }

  @Get('dashboard/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List items awaiting manual review (dashboard)' })
  async dashboardPending(@Query() query: ModerationDashboardQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      success: true,
      data: await this.moderationService.listPending(page, limit),
    };
  }

  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Moderation dashboard counters' })
  async dashboardStats() {
    return {
      success: true,
      data: await this.moderationService.getDashboardStats(),
    };
  }

  @Post('dashboard/items/:id/action')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply moderation action to a queued item' })
  async applyAction(
    @Param('id') id: string,
    @Body() dto: ApplyModerationActionDto,
    @Request() req: { user: { id: string } },
  ) {
    const item = await this.moderationService.applyAction(
      id,
      dto.action,
      req.user.id,
      dto.notes,
    );
    return { success: true, data: { item } };
  }

  @Post('appeals')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an appeal for a moderation decision' })
  async createAppeal(
    @Body() dto: CreateAppealDto,
    @Request() req: { user: { id: string } },
  ) {
    const appeal = await this.moderationService.createAppeal(
      req.user.id,
      dto.moderationItemId,
      dto.message,
    );
    return { success: true, data: { appeal } };
  }

  @Get('appeals/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pending appeals (moderator queue)' })
  async appealsPending(@Query() query: ModerationDashboardQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return {
      success: true,
      data: await this.moderationService.listAppealsPending(page, limit),
    };
  }

  @Post('appeals/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve an appeal' })
  async resolveAppeal(
    @Param('id') id: string,
    @Body() dto: ResolveAppealDto,
    @Request() req: { user: { id: string } },
  ) {
    const appeal = await this.moderationService.resolveAppeal(
      id,
      dto.resolution,
      req.user.id,
      dto.resolutionNote,
    );
    return { success: true, data: { appeal } };
  }
}
