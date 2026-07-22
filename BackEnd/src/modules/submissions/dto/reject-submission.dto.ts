import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectSubmissionDto {
  @ApiProperty({
    description: 'Reason for rejection',
    minLength: 10,
    maxLength: 500,
    example: 'Insufficient proof of identity',
  })
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters' })
  reason: string;

  @ApiPropertyOptional({
    description: 'Optional notes for the rejection',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
