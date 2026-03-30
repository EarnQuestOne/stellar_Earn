import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsIn,
} from 'class-validator';
import { ModerationAction } from '../entities/moderation-item.entity';
import { AppealStatus } from '../entities/moderation-appeal.entity';

export class ScanTextDto {
  @ApiProperty({ example: 'Quest title or description to scan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  text: string;
}

export class ApplyModerationActionDto {
  @ApiProperty({ enum: ModerationAction })
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class CreateAppealDto {
  @ApiProperty()
  @IsUUID()
  moderationItemId: string;

  @ApiProperty({ description: 'Why this moderation decision should be reviewed' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  message: string;
}

export class ResolveAppealDto {
  @ApiProperty({ enum: [AppealStatus.APPROVED, AppealStatus.REJECTED] })
  @IsIn([AppealStatus.APPROVED, AppealStatus.REJECTED])
  resolution: AppealStatus.APPROVED | AppealStatus.REJECTED;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}

export class ModerationDashboardQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
