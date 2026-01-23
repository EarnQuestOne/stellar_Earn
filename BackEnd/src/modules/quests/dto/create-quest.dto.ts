import {
    IsString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsEnum,
    IsPositive,
    IsInt,
    MinLength,
    MaxLength,
    Min,
    IsDate,
    ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestStatus } from '../enums/quest-status.enum';

export class CreateQuestDto {
    @ApiProperty({
        description: 'Quest title',
        example: 'Complete KYC Verification',
        minLength: 3,
        maxLength: 200,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiProperty({
        description: 'Detailed quest description',
        example: 'Complete the KYC verification process to earn rewards',
        minLength: 10,
        maxLength: 2000,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    @MaxLength(2000)
    description: string;

    @ApiProperty({
        description: 'Reward amount in XLM',
        example: 10.5,
        minimum: 0.01,
    })
    @IsNumber()
    @IsPositive()
    @Min(0.01)
    reward: number;

    @ApiPropertyOptional({
        description: 'Quest status',
        enum: QuestStatus,
        default: QuestStatus.DRAFT,
    })
    @IsOptional()
    @IsEnum(QuestStatus)
    status?: QuestStatus;

    @ApiPropertyOptional({
        description: 'Maximum number of completions allowed',
        example: 100,
    })
    @IsOptional()
    @IsInt()
    @IsPositive()
    maxCompletions?: number;

    @ApiPropertyOptional({
        description: 'Quest start date',
        example: '2026-01-23T00:00:00Z',
    })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    @ApiPropertyOptional({
        description: 'Quest end date',
        example: '2026-12-31T23:59:59Z',
    })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @ValidateIf((o) => o.startDate && o.endDate)
    endDate?: Date;
}
