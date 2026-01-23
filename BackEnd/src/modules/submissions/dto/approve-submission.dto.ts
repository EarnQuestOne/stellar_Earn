import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveSubmissionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
