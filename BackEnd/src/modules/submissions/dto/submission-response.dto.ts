import { ApiProperty } from '@nestjs/swagger';

export class SubmissionQuestInfoDto {
  @ApiProperty({
    description: 'Quest ID',
    example: 'quest_123',
  })
  id: string;

  @ApiProperty({
    description: 'Quest title',
    example: 'Complete KYC',
  })
  title: string;

  @ApiProperty({
    description: 'Reward amount',
    example: 10.5,
    required: false,
  })
  rewardAmount?: number;
}

export class SubmissionUserInfoDto {
  @ApiProperty({
    description: 'User ID',
    example: 'user_123',
  })
  id: string;

  @ApiProperty({
    description: 'Stellar address',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    required: false,
  })
  stellarAddress?: string;
}

export class SubmissionDataDto {
  @ApiProperty({
    description: 'Submission ID',
    example: 'subm_123',
  })
  id: string;

  @ApiProperty({
    description: 'Submission status',
    example: 'APPROVED',
  })
  status: string;

  @ApiProperty({
    description: 'Approval timestamp',
    example: '2026-01-24T08:00:00.000Z',
    required: false,
  })
  approvedAt?: Date;

  @ApiProperty({
    description: 'Approver ID',
    example: 'verifier_1',
    required: false,
  })
  approvedBy?: string;

  @ApiProperty({
    description: 'Rejection timestamp',
    example: '2026-01-24T09:00:00.000Z',
    required: false,
  })
  rejectedAt?: Date;

  @ApiProperty({
    description: 'Rejecter ID',
    example: 'verifier_1',
    required: false,
  })
  rejectedBy?: string;

  @ApiProperty({
    description: 'Rejection reason',
    example: 'Insufficient proof of identity',
    required: false,
  })
  rejectionReason?: string;

  @ApiProperty({
    description: 'Quest information',
    type: SubmissionQuestInfoDto,
  })
  quest: SubmissionQuestInfoDto;

  @ApiProperty({
    description: 'User information',
    type: SubmissionUserInfoDto,
  })
  user: SubmissionUserInfoDto;
}

export class ApproveSubmissionResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Submission approved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Submission data',
    type: SubmissionDataDto,
  })
  data: {
    submission: SubmissionDataDto;
  };
}

export class RejectSubmissionResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Submission rejected',
  })
  message: string;

  @ApiProperty({
    description: 'Submission data',
    type: SubmissionDataDto,
  })
  data: {
    submission: SubmissionDataDto;
  };
}

export class GetSubmissionResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Submission data',
    type: 'object',
  })
  data: {
    submission: any;
  };
}

export class QuestSubmissionsResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Submissions data',
    type: 'object',
  })
  data: {
    submissions: any[];
    total: number;
  };
}
