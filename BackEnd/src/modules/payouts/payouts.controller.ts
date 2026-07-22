import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Idempotent } from './decorators/idempotent.decorator';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { PayoutsService } from './payouts.service';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthUser } from '../auth/auth.service';
import { ClaimPayoutDto, CreatePayoutDto } from './dto/claim-payout.dto';
import {
  PayoutQueryDto,
  PayoutHistoryResponseDto,
  PayoutResponseDto,
  PayoutStatsDto,
} from './dto/payout-query.dto';
import { Role } from '../../common/enums/role.enum';

@ApiTags('Payouts')
@Controller('payouts')
@UseGuards(JwtAuthGuard)
@UseInterceptors(IdempotencyInterceptor)
@ApiBearerAuth()
export class PayoutsController {
  constructor(
    private readonly payoutsService: PayoutsService,
    private readonly fraudRiskRulesService: FraudRiskRulesService,
  ) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'payout' })
  @Idempotent()
  @ApiOperation({ summary: 'Claim a pending payout' })
  @ApiResponse({
    status: 200,
    description: 'Payout claimed successfully and processing started',
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Payout cannot be claimed' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async claimPayout(
    @Body() claimPayoutDto: ClaimPayoutDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutResponseDto> {
    return this.payoutsService.claimPayout(claimPayoutDto, user.stellarAddress);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get payout history for current user' })
  @ApiResponse({
    status: 200,
    description: 'Payout history retrieved successfully',
    type: PayoutHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getMyPayoutHistory(
    @Query() query: PayoutQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutHistoryResponseDto> {
    return this.payoutsService.getPayoutHistory(query, user.stellarAddress);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get payout statistics for current user' })
  @ApiResponse({
    status: 200,
    description: 'Payout statistics retrieved successfully',
    type: PayoutStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyPayoutStats(
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutStatsDto> {
    return this.payoutsService.getPayoutStats(user.stellarAddress);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payout by ID' })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payout retrieved successfully',
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getPayoutById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PayoutResponseDto> {
    return this.payoutsService.getPayoutById(id, user.stellarAddress);
  }

  // Admin endpoints

  @Post('admin/create')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new payout (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Payout created successfully',
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async createPayout(
    @Body() createPayoutDto: CreatePayoutDto,
  ): Promise<PayoutResponseDto> {
    const payout = await this.payoutsService.createPayout(createPayoutDto);
    return {
      id: payout.id,
      stellarAddress: payout.stellarAddress,
      amount: Number(payout.amount),
      asset: payout.asset,
      status: payout.status,
      type: payout.type,
      questId: payout.questId,
      submissionId: payout.submissionId,
      transactionHash: payout.transactionHash,
      stellarLedger: payout.stellarLedger,
      settlementConfirmations: payout.settlementConfirmations,
      settlementConfirmedAt: payout.settlementConfirmedAt,
      failureReason: payout.failureReason,
      retryCount: payout.retryCount,
      processedAt: payout.processedAt,
      claimedAt: payout.claimedAt,
      createdAt: payout.createdAt,
    };
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all payouts (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All payouts retrieved successfully',
    type: PayoutHistoryResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiQuery({
    name: 'stellarAddress',
    required: false,
    description: 'Filter by address',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  async getAllPayouts(
    @Query() query: PayoutQueryDto,
  ): Promise<PayoutHistoryResponseDto> {
    return this.payoutsService.getPayoutHistory(query);
  }

  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get global payout statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Global payout statistics retrieved successfully',
    type: PayoutStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getGlobalPayoutStats(): Promise<PayoutStatsDto> {
    return this.payoutsService.getPayoutStats();
  }

  @Post('admin/:id/retry')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed payout (Admin only)' })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payout retry initiated',
    type: PayoutResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Only failed payouts can be retried',
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async retryPayout(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutsService.retryPayout(id);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get any payout by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({
    status: 200,
    description: 'Payout retrieved successfully',
    type: PayoutResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getAnyPayoutById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PayoutResponseDto> {
    return this.payoutsService.getPayoutById(id);
  }

  @Get('fraud-risk/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Analyze payout for fraud/risk anomalies (Admin only)',
  })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({
    status: 200,
    description: 'Fraud/risk assessment completed',
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async analyzePayoutRisk(@Param('id', ParseUUIDPipe) id: string) {
    return this.fraudRiskRulesService.analyzePayout(id);
  }

  @Get('fraud-risk/batch')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Batch analyze recent payouts for fraud/risk anomalies (Admin only)',
  })
  @ApiQuery({
    name: 'hours',
    description: 'Hours to look back',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Batch fraud/risk assessment completed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async analyzeRecentPayoutsRisk(@Query('hours') hours: number = 24) {
    return this.fraudRiskRulesService.analyzeRecentPayouts(hours);
  }

  @Get('fraud-risk/statistics')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get fraud/risk statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Fraud/risk statistics retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getRiskStatistics() {
    return this.fraudRiskRulesService.getRiskStatistics();
  }
}
