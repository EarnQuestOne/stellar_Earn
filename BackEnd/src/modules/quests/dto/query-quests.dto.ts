import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

export enum QuestStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum QuestSortBy {
  CREATED_AT = 'createdAt',
  REWARD_AMOUNT = 'rewardAmount',
  DEADLINE = 'deadline',
  TITLE = 'title',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query DTO for listing quests.
 * Extends CursorPaginationDto so every list endpoint
 * automatically gains `cursor` and `limit` fields.
 */
export class QueryQuestsDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by quest status',
    enum: QuestStatus,
    example: QuestStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(QuestStatus)
  status?: QuestStatus;

  @ApiPropertyOptional({
    description: 'Filter by creator Stellar address',
    example: 'GABC...XYZ',
  })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({
    description: 'Search by quest title (case-insensitive partial match)',
    example: 'KYC',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by quest category tag',
    example: 'defi',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Sort results by this field',
    enum: QuestSortBy,
    default: QuestSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(QuestSortBy)
  sortBy?: QuestSortBy = QuestSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}