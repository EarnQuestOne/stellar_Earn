import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../entities/quest.entity';

export class QuestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  rewardAmount: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

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
    return dto;
  }
}

export class PaginatedQuestsResponseDto {
  @ApiProperty({ type: [QuestResponseDto] })
  data: QuestResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}