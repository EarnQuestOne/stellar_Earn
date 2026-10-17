import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import {
  AppealDisputeDto,
  OpenDisputeDto,
  ResolveDisputeDto,
} from './dto/dispute.dto';
import { DisputesService } from './disputes.service';

@ApiTags('Disputes')
@ApiBearerAuth()
@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Open a new dispute for a submission' })
  @ApiResponse({ status: 201, description: 'Dispute opened successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bearer token missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Forbidden – caller is not allowed to open a dispute for this submission.' })
  @ApiResponse({ status: 404, description: 'Submission not found.' })
  open(@Body() dto: OpenDisputeDto, @CurrentUser() user: AuthUser) {
    return this.service.open(dto, user);
  }

  @Post(':id/appeal')
  @ApiOperation({ summary: 'Appeal an existing dispute by ID' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the dispute to appeal', type: String })
  @ApiResponse({ status: 200, description: 'Dispute appealed successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload or dispute state.' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bearer token missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Forbidden – caller is not a party to this dispute.' })
  @ApiResponse({ status: 404, description: 'Dispute not found.' })
  appeal(
    @Param('id') id: string,
    @Body() dto: AppealDisputeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.appeal(id, dto, user);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an existing dispute by ID' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the dispute to resolve', type: String })
  @ApiResponse({ status: 200, description: 'Dispute resolved successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid request payload or dispute state.' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bearer token missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Forbidden – caller is not authorised to resolve this dispute.' })
  @ApiResponse({ status: 404, description: 'Dispute not found.' })
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.resolve(id, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List all disputes for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of disputes returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bearer token missing or invalid.' })
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single dispute by ID' })
  @ApiParam({ name: 'id', description: 'Unique identifier of the dispute', type: String })
  @ApiResponse({ status: 200, description: 'Dispute returned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized – bearer token missing or invalid.' })
  @ApiResponse({ status: 403, description: 'Forbidden – caller does not have access to this dispute.' })
  @ApiResponse({ status: 404, description: 'Dispute not found.' })
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.get(id, user);
  }
}
