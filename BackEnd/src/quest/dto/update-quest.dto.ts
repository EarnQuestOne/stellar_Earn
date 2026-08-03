import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UpdateQuestDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  rewardAmount?: number;
}