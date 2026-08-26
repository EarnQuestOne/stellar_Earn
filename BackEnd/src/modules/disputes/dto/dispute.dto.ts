import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class OpenDisputeDto {
  @IsString()
  submissionId: string;

  @IsString()
  arbitratorAddress: string;
}

export class AppealDisputeDto {
  @IsString()
  newArbitratorAddress: string;
}

export class ResolveDisputeDto {
  @IsBoolean()
  upheld: boolean;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  slashBps?: number;
}