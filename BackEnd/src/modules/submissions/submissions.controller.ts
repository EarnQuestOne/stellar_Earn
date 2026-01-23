import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VerifierGuard } from '../auth/guards/verifier.guard';

@Controller('quests/:questId/submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * Approve a submission
   * POST /quests/:questId/submissions/:id/approve
   */
  @Post(':id/approve')
  @UseGuards(VerifierGuard)
  @HttpCode(HttpStatus.OK)
  async approveSubmission(
    @Param('questId') questId: string,
    @Param('id') submissionId: string,
    @Body() approveDto: ApproveSubmissionDto,
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

  /**
   * Reject a submission
   * POST /quests/:questId/submissions/:id/reject
   */
  @Post(':id/reject')
  @UseGuards(VerifierGuard)
  @HttpCode(HttpStatus.OK)
  async rejectSubmission(
    @Param('questId') questId: string,
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

  /**
   * Get submission details
   * GET /quests/:questId/submissions/:id
   */
  @Get(':id')
  async getSubmission(
    @Param('questId') questId: string,
    @Param('id') submissionId: string,
  ) {
    const submission = await this.submissionsService.findOne(submissionId);

    return {
      success: true,
      data: { submission },
    };
  }

  /**
   * Get all submissions for a quest
   * GET /quests/:questId/submissions
   */
  @Get()
  async getQuestSubmissions(@Param('questId') questId: string) {
    const submissions = await this.submissionsService.findByQuest(questId);

    return {
      success: true,
      data: {
        submissions,
        total: submissions.length,
      },
    };
  }
}
