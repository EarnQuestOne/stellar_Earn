import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmitProofDto } from './dto/submit-proof.dto';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post('quests/:id/submit')
  submitProof(@Param('id') questId: string, @Body() dto: SubmitProofDto) {
    dto.questId = questId;
    return this.submissionsService.submitProof(dto);
  }

  @Get('user/:userId')
  getUserSubmissions(@Param('userId') userId: string) {
    return this.submissionsService.getUserSubmissions(userId);
  }

  @Get('quests/:id')
  getQuestSubmissions(@Param('id') questId: string) {
    return this.submissionsService.getQuestSubmissions(questId);
  }
}
