import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PostmortemService } from './postmortems.service';
import {
  CreatePostmortemDto,
  UpdatePostmortemDto,
  PostmortemResponseDto,
  PostmortemQueryDto,
  PostmortemStatsDto,
} from './dto/postmortem.dto';

@ApiTags('Postmortems')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('postmortems')
export class PostmortemController {
  constructor(private postmortemService: PostmortemService) {}

  /**
   * Create a new postmortem
   */
  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new postmortem for an incident' })
  @ApiResponse({
    status: 201,
    description: 'Postmortem created successfully',
    type: PostmortemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or postmortem already exists',
  })
  async create(
    @Body() dto: CreatePostmortemDto,
  ): Promise<PostmortemResponseDto> {
    return this.postmortemService.create(dto);
  }

  /**
   * Get postmortem by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get postmortem by ID' })
  @ApiResponse({
    status: 200,
    description: 'Postmortem found',
    type: PostmortemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  async getById(@Param('id') id: string): Promise<PostmortemResponseDto> {
    return this.postmortemService.getById(id);
  }

  /**
   * Get postmortem by incident ID
   */
  @Get('incident/:incidentId')
  @ApiOperation({ summary: 'Get postmortem by incident ID' })
  @ApiResponse({
    status: 200,
    description: 'Postmortem found',
    type: PostmortemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  async getByIncidentId(
    @Param('incidentId') incidentId: string,
  ): Promise<PostmortemResponseDto> {
    return this.postmortemService.getByIncidentId(incidentId);
  }

  /**
   * List postmortems with filtering and pagination
   */
  @Get()
  @ApiOperation({ summary: 'List postmortems with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Postmortems retrieved',
  })
  async list(@Query() query: PostmortemQueryDto): Promise<{
    data: PostmortemResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.postmortemService.list(query);
  }

  /**
   * Update postmortem
   */
  @Put(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Update postmortem details' })
  @ApiResponse({
    status: 200,
    description: 'Postmortem updated successfully',
    type: PostmortemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  @ApiResponse({ status: 400, description: 'Invalid update request' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostmortemDto,
  ): Promise<PostmortemResponseDto> {
    return this.postmortemService.update(id, dto);
  }

  /**
   * Add action item to postmortem
   */
  @Post(':id/action-items')
  @HttpCode(201)
  @ApiOperation({ summary: 'Add action item to postmortem' })
  @ApiResponse({
    status: 201,
    description: 'Action item added',
    type: PostmortemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  async addActionItem(
    @Param('id') id: string,
    @Body()
    actionItem: {
      action: string;
      owner: string;
      dueDate: Date;
      priority: 'P0' | 'P1' | 'P2' | 'P3';
    },
  ): Promise<PostmortemResponseDto> {
    return this.postmortemService.addActionItem(id, actionItem);
  }

  /**
   * Mark action item as complete
   */
  @Put(':id/action-items/:actionItemId/complete')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark action item as complete' })
  @ApiResponse({
    status: 200,
    description: 'Action item marked complete',
    type: PostmortemResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Postmortem or action item not found',
  })
  async completeActionItem(
    @Param('id') id: string,
    @Param('actionItemId') actionItemId: string,
  ): Promise<PostmortemResponseDto> {
    return this.postmortemService.completeActionItem(id, actionItemId);
  }

  /**
   * Get postmortem statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get postmortem statistics and metrics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    type: PostmortemStatsDto,
  })
  async getStatistics(): Promise<PostmortemStatsDto> {
    return this.postmortemService.getStatistics();
  }

  /**
   * Find related incidents
   */
  @Get(':id/related')
  @ApiOperation({ summary: 'Find incidents related to this postmortem' })
  @ApiResponse({
    status: 200,
    description: 'Related incidents found',
    type: [PostmortemResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  async findRelated(@Param('id') id: string): Promise<PostmortemResponseDto[]> {
    return this.postmortemService.findRelatedIncidents(id);
  }

  /**
   * Publish postmortem
   */
  @Post(':id/publish')
  @HttpCode(200)
  @ApiOperation({ summary: 'Publish postmortem (make visible to all)' })
  @ApiResponse({
    status: 200,
    description: 'Postmortem published',
    type: PostmortemResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Postmortem not found' })
  @ApiResponse({
    status: 400,
    description: 'Postmortem must be in APPROVED status',
  })
  async publish(@Param('id') id: string): Promise<PostmortemResponseDto> {
    return this.postmortemService.publish(id);
  }
}
