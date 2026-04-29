import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,           // ← was missing from the original
  UseGuards,
  Request,
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
import { SubmissionsService } from './submissions.service';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { SubmitProofDto } from './dto/submit-proof.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifierGuard } from '../auth/guards/verifier.guard';
import { QuerySubmissionsDto } from './dto/query-submissions.dto';

@ApiTags('Submissions')
@Controller('quests/:questId/submissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // ─── Submit proof ──────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit proof for a quest' })
  @ApiParam({ name: 'questId', description: 'Quest UUID' })
  @ApiResponse({ status: 201, description: 'Proof submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid proof data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  async submitProof(
    @Param('questId') questId: string,
    @Body() submitProofDto: SubmitProofDto,
    @Request() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    const submission = await this.submissionsService.submitProof(
      questId,
      submitProofDto,
      userId,
    );

    return {
      success: true,
      message: 'Proof submitted successfully',
      data: { submission },
    };
  }

  // ─── List submissions for a quest ──────────────────────────────────────────

  /**
   * GET /quests/:questId/submissions
   *
   * Returns a cursor-paginated list of submissions for the given quest.
   * Pass the `nextCursor` value from a response back as `cursor` in the
   * next request to advance the page.
   *
   * Example:
   *   GET /quests/abc/submissions?limit=20
   *   GET /quests/abc/submissions?limit=20&cursor=<nextCursor>
   */
  @Get()
  @ApiOperation({ summary: 'Get submissions for a quest (cursor-paginated)' })
  @ApiParam({ name: 'questId', description: 'Quest UUID' })
  @ApiResponse({
    status: 200,
    description: 'Paginated submissions list',
    schema: {
      example: {
        data: [
          {
            id: 'subm_123',
            status: 'PENDING',
            createdAt: '2026-01-24T08:00:00.000Z',
            user: { id: 'user_123', stellarAddress: 'G...' },
          },
        ],
        nextCursor: 'eyJpZCI6InN1Ym1fMTIzIiwiY3JlYXRlZEF0IjoiMjAyNi0wMS0yNFQwODowMDowMC4wMDBaIn0',
        hasMore: true,
        total: 87,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuestSubmissions(
    @Param('questId') questId: string,
    @Query() queryDto: QuerySubmissionsDto,
  ) {
    return this.submissionsService.findByQuest(questId, queryDto);
  }

  // ─── Single submission ─────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Get submission details' })
  @ApiParam({ name: 'questId', description: 'Quest UUID' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission details retrieved' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  async getSubmission(
    @Param('questId') _questId: string,
    @Param('id') submissionId: string,
  ) {
    const submission = await this.submissionsService.findOne(submissionId);
    return { success: true, data: { submission } };
  }

  // ─── Approve ───────────────────────────────────────────────────────────────

  @Post(':id/approve')
  @UseGuards(VerifierGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a quest submission' })
  @ApiParam({ name: 'questId', description: 'Quest UUID' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission approved successfully' })
    @Param('id') submissionId: string,
    @Request() req: Request & { user: { id: string } },
  ) {
    const verifierId = req.user.id;
    const submission = await this.submissionsService.approveSubmission(
      submissionId,
      approveDto,
      verifierId,
    );

    return {
      success: true,
      message: 'Submission approved successfully',
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          approvedAt: submission.approvedAt,
          approvedBy: submission.approvedBy,
          quest: {
            id: submission.quest.id,
            title: submission.quest.title,
            rewardAmount: submission.quest.rewardAmount,
          },
          user: {
            id: submission.user.id,
            stellarAddress: submission.user.stellarAddress,
          },
        },
      },
    };
  }

  // ─── Reject ────────────────────────────────────────────────────────────────

  @Post(':id/reject')
  @UseGuards(VerifierGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a quest submission' })
  @ApiParam({ name: 'questId', description: 'Quest UUID' })
  @ApiParam({ name: 'id', description: 'Submission UUID' })
  @ApiResponse({ status: 200, description: 'Submission rejected' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Verifier role required',
  })
  async rejectSubmission(
    @Param('questId') _questId: string,
    @Param('id') submissionId: string,
    @Body() rejectDto: RejectSubmissionDto,
    @Request() req: Request & { user: { id: string } },
  ) {
    const verifierId = req.user.id;
    const submission = await this.submissionsService.rejectSubmission(
      submissionId,
      rejectDto,
      verifierId,
    );

    return {
      success: true,
      message: 'Submission rejected',
      data: {
        submission: {
          id: submission.id,
          status: submission.status,
          rejectedAt: submission.rejectedAt,
          rejectedBy: submission.rejectedBy,
          rejectionReason: submission.rejectionReason,
          quest: {
            id: submission.quest.id,
            title: submission.quest.title,
          },
          user: {
            id: submission.user.id,
          },
        },
      },
    };
  }
}
