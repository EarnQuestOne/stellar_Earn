import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { CursorPaginationDto } from '../../../common/dto/pagination.dto';

/**
 * Query DTO for listing notifications.
 * Extends CursorPaginationDto — `cursor` and `limit` are inherited.
 */
export class NotificationQueryDto extends CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'When true, return only unread notifications',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean;
}