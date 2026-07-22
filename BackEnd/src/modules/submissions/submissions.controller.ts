import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubmissionsService } from './submissions.service';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { Submission } from './entities/submission.entity';

@ApiTags('Submissions')
@ApiBearerAuth()
@Controller('quests/:questId/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @RateLimit({ name: 'submission' })
  @ApiOperation({ summary: 'List submissions for a quest' })
  @ApiParam({ name: 'questId', description: 'Quest ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Submissions list returned' })
  async list(@Param('questId') questId: string): Promise<{
    success: true;
    data: { submissions: Submission[]; total: number };
  }> {
    const submissions = await this.submissionsService.findByQuest(questId);
    return {
      success: true,
      data: { submissions, total: submissions.length },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ name: 'submission' })
  @ApiOperation({
    summary: 'Submit proof for a quest (authenticated user)',
  })
  @ApiParam({ name: 'questId', description: 'Quest ID (UUID)' })
  @ApiResponse({ status: 201, description: 'Submission created' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid input, missing wallet link, or quest not accepting submissions',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  submit(
    @Param('questId') questId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: true; data: { submission: Submission } }> {
    return this.submissionsService
      .createSubmission(questId, dto, user.id)
      .then((submission) => ({ success: true, data: { submission } }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single submission by id' })
  @ApiParam({ name: 'questId', description: 'Quest ID (UUID)' })
  @ApiParam({ name: 'id', description: 'Submission ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Submission returned' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  getOne(
    @Param('id') id: string,
  ): Promise<{ success: true; data: { submission: Submission } }> {
    return this.submissionsService
      .findOne(id)
      .then((submission) => ({ success: true, data: { submission } }));
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'submission' })
  @ApiOperation({
    summary:
      'Approve a submission (verifier/admin only). Triggers on-chain approve_submission.',
  })
  @ApiParam({ name: 'questId', description: 'Quest ID (UUID)' })
  @ApiParam({ name: 'id', description: 'Submission ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Submission approved; on-chain tx hash returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or on-chain failure',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not the assigned verifier or admin',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  @ApiResponse({ status: 409, description: 'CAS conflict (status changed)' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveSubmissionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: true; data: { submission: Submission } }> {
    return this.submissionsService
      .approveSubmission(id, dto, user.id)
      .then((submission) => ({ success: true, data: { submission } }));
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'submission' })
  @ApiOperation({ summary: 'Reject a submission (verifier/admin only)' })
  @ApiParam({ name: 'questId', description: 'Quest ID (UUID)' })
  @ApiParam({ name: 'id', description: 'Submission ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Submission rejected' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or empty reason',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not the assigned verifier or admin',
  })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectSubmissionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ success: true; data: { submission: Submission } }> {
    return this.submissionsService
      .rejectSubmission(id, dto, user.id)
      .then((submission) => ({ success: true, data: { submission } }));
  }
}
