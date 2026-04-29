import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

export enum UserSortBy {
  XP = 'xp',
  LEVEL = 'level',
  CREATED_AT = 'createdAt',
  USERNAME = 'username',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Query DTO for searching/listing users.
 * Extends CursorPaginationDto — `cursor` and `limit` are inherited.
 *
 * NOTE: The old `page` field has been removed. Callers must migrate to
 * cursor-based pagination using the `cursor` + `limit` fields.
 */
export class SearchUsersDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Search term matched against username or Stellar address (case-insensitive)',
    example: 'alice',
  })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: 'Sort users by this field',
    enum: UserSortBy,
    default: UserSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(UserSortBy)
  sortBy?: UserSortBy = UserSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}