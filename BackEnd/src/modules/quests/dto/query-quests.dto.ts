import { IsOptional, IsEnum, IsString, IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { QuestStatus } from '../enums/quest-status.enum';

export class QueryQuestsDto {
    @ApiPropertyOptional({
        description: 'Filter by quest status',
        enum: QuestStatus,
    })
    @IsOptional()
    @IsEnum(QuestStatus)
    status?: QuestStatus;

    @ApiPropertyOptional({
        description: 'Filter by creator Stellar address',
        example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    })
    @IsOptional()
    @IsString()
    creatorAddress?: string;

    @ApiPropertyOptional({
        description: 'Minimum reward amount',
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    minReward?: number;

    @ApiPropertyOptional({
        description: 'Maximum reward amount',
        example: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    maxReward?: number;

    @ApiPropertyOptional({
        description: 'Page number',
        example: 1,
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Items per page',
        example: 10,
        default: 10,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @ApiPropertyOptional({
        description: 'Sort field',
        example: 'createdAt',
        default: 'createdAt',
        enum: ['createdAt', 'updatedAt', 'title', 'reward', 'status'],
    })
    @IsOptional()
    @IsString()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        description: 'Sort order',
        example: 'DESC',
        default: 'DESC',
        enum: ['ASC', 'DESC'],
    })
    @IsOptional()
    @IsEnum(['ASC', 'DESC'])
    sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
