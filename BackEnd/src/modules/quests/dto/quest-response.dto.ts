import { ApiProperty } from '@nestjs/swagger';
import { Quest } from '../entities/quest.entity';

export class QuestResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    reward: number;

    @ApiProperty()
    status: string;

    @ApiProperty()
    creatorAddress: string;

    @ApiProperty({ required: false })
    maxCompletions?: number;

    @ApiProperty()
    currentCompletions: number;

    @ApiProperty({ required: false })
    startDate?: Date;

    @ApiProperty({ required: false })
    endDate?: Date;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    static fromEntity(quest: Quest): QuestResponseDto {
        const dto = new QuestResponseDto();
        dto.id = quest.id;
        dto.title = quest.title;
        dto.description = quest.description;
        dto.reward = quest.reward;
        dto.status = quest.status;
        dto.creatorAddress = quest.creatorAddress;
        dto.maxCompletions = quest.maxCompletions;
        dto.currentCompletions = quest.currentCompletions;
        dto.startDate = quest.startDate;
        dto.endDate = quest.endDate;
        dto.createdAt = quest.createdAt;
        dto.updatedAt = quest.updatedAt;
        return dto;
    }
}

export class PaginatedQuestsResponseDto {
    @ApiProperty({ type: [QuestResponseDto] })
    data: QuestResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
