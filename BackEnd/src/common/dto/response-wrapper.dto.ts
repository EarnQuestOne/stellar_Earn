import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized response wrapper for all API responses
 * This matches the structure applied by ResponseFormatInterceptor
 */
export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'Response data payload',
    example: {},
  })
  data: T;

  @ApiProperty({
    description: 'Response metadata including timestamp',
    type: 'object',
    example: {
      timestamp: 1700000000000,
    },
  })
  meta: {
    timestamp: number;
  };
}

/**
 * Generic metadata object for responses
 */
export class ResponseMetaDto {
  @ApiProperty({
    description: 'Unix timestamp in milliseconds',
    example: 1700000000000,
  })
  timestamp: number;
}

/**
 * Paginated response wrapper with metadata
 */
export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Array of items',
    type: Array,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: 'object',
  })
  meta: {
    timestamp: number;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Success response wrapper
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Operation completed successfully',
    required: false,
  })
  message?: string;

  @ApiProperty({
    description: 'Response data payload',
    required: false,
  })
  data?: any;
}
