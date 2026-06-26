import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Quest } from '../entities/quest.entity';

export class QuestResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Complete KYC Verification' })
  title: string;

  @ApiProperty({
    example: 'Complete the KYC verification process to earn rewards',
  })
  description: string;

  @ApiProperty({ example: 10.5 })
  rewardAmount: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  createdBy: string;

  @ApiProperty({ example: '2026-01-23T12:34:56.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-24T08:00:00.000Z' })
  updatedAt: Date;

  // Extra fields for compatibility with frontend serialization contract
  @ApiProperty({ example: '42' })
  contractQuestId: string;

  @ApiProperty({ example: 'XLM' })
  rewardAsset: string;

  @ApiPropertyOptional({ example: '2026-07-01T00:00:00.000Z', nullable: true })
  deadline?: Date | null;

  @ApiProperty({ example: 0 })
  totalClaims: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxParticipants?: number;

  @ApiProperty({ example: 0 })
  currentParticipants: number;

  @ApiPropertyOptional({ example: 'General' })
  category?: string;

  static fromEntity(quest: Quest): QuestResponseDto {
    const dto = new QuestResponseDto();
    dto.id = quest.id;
    dto.title = quest.title;
    dto.description = quest.description;
    dto.rewardAmount = quest.rewardAmount;
    dto.status = quest.status;
    dto.createdBy = quest.createdBy;
    dto.createdAt = quest.createdAt;
    dto.updatedAt = quest.updatedAt;

    // Map the database columns to the frontend contract fields
    dto.contractQuestId = quest.contractTaskId || '0';
    dto.rewardAsset = quest.rewardAsset || 'XLM';
    dto.deadline = quest.deadline || null;
    dto.currentParticipants = quest.currentCompletions || 0;
    dto.totalClaims = quest.currentCompletions || 0;
    dto.maxParticipants = quest.maxCompletions ?? undefined;
    dto.category = quest.category || 'General';

    return dto;
  }
}

export class PaginatedQuestsResponseDto {
  @ApiProperty({ type: [QuestResponseDto] })
  data: QuestResponseDto[];

  @ApiProperty({ required: false })
  total?: number;

  @ApiProperty({ required: false })
  page?: number;

  @ApiProperty()
  limit: number;

  @ApiProperty({ required: false })
  totalPages?: number;

  @ApiProperty({ required: false })
  nextCursor?: string;
}
