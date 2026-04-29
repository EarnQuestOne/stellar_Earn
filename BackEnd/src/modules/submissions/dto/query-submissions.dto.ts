import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum SubmissionSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query DTO for listing submissions under a quest.
 * Extends CursorPaginationDto — `cursor` and `limit` are inherited.
 */
export class QuerySubmissionsDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by submission status',
    enum: SubmissionStatus,
    example: SubmissionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiPropertyOptional({
    description: 'Filter by submitting user ID',
    example: 'user-uuid-here',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: SubmissionSortBy,
    default: SubmissionSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(SubmissionSortBy)
  sortBy?: SubmissionSortBy = SubmissionSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}