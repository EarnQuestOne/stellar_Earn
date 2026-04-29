import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (opaque string — pass the nextCursor value from the previous response)',
    example: 'eyJpZCI6ImFiYzEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjNUMTI6MzQ6NTYuMDAwWiJ9',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Generic paginated response wrapper.
 *
 * Usage:
 *   return new PaginatedResponseDto(items, nextCursor, total);
 *
 * For Swagger, extend this class with a concrete type:
 *   class PaginatedUsersDto extends PaginatedResponseDto<User> {}
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of result items for this page',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description:
      'Opaque cursor to pass as `cursor` in the next request. Null when there are no more pages.',
    example: 'eyJpZCI6ImFiYzEyMyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjNUMTI6MzQ6NTYuMDAwWiJ9',
    nullable: true,
  })
  nextCursor: string | null;

  @ApiProperty({
    description: 'Whether more pages exist after this one',
    example: true,
  })
  hasMore: boolean;

  @ApiPropertyOptional({
    description: 'Total number of records matching the query (may be omitted for performance)',
    example: 142,
  })
  total?: number;

  constructor(data: T[], nextCursor: string | null, total?: number) {
    this.data = data;
    this.nextCursor = nextCursor;
    this.hasMore = nextCursor !== null;
    this.total = total;
  }
}

/**
 * Encode a cursor payload (id + optional tiebreaker) to a base64 string.
 * Always encode — never expose raw IDs as cursors.
 */
export function encodeCursor(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * Decode a cursor string back to its payload.
 * Returns null on any parse error so callers can treat a bad cursor
 * as "start from the beginning".
 */
export function decodeCursor(cursor: string): Record<string, unknown> | null {
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}