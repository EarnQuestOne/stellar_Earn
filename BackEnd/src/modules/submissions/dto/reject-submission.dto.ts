import {
  IsNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RejectSubmissionDto {
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Rejection reason cannot exceed 500 characters' })
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
