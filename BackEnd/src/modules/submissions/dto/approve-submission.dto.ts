import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApproveSubmissionDto {
  @ApiPropertyOptional({
    description: 'Optional notes for approval',
    example: 'Looks good, reward issued.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
