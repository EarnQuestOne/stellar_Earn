import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Quest } from './entities/quest.entity';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { QueryQuestsDto } from './dto/query-quests.dto';
import { QuestStatus } from './enums/quest-status.enum';
import {
    QuestResponseDto,
    PaginatedQuestsResponseDto,
} from './dto/quest-response.dto';

@Injectable()
export class QuestsService {
    constructor(
        @InjectRepository(Quest)
        private readonly questRepository: Repository<Quest>,
    ) { }

    async create(
        createQuestDto: CreateQuestDto,
        creatorAddress: string,
    ): Promise<QuestResponseDto> {
        if (createQuestDto.startDate && createQuestDto.endDate) {
            if (createQuestDto.endDate <= createQuestDto.startDate) {
                throw new BadRequestException(
                    'End date must be after start date',
                );
            }
        }

        const quest = this.questRepository.create({
            ...createQuestDto,
            creatorAddress,
        });

        const savedQuest = await this.questRepository.save(quest);
        return QuestResponseDto.fromEntity(savedQuest);
    }

    async findAll(
        queryDto: QueryQuestsDto,
    ): Promise<PaginatedQuestsResponseDto> {
        const {
            status,
            creatorAddress,
            minReward,
            maxReward,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'DESC',
        } = queryDto;

        const where: FindOptionsWhere<Quest> = {};

        if (status) {
            where.status = status;
        }

        if (creatorAddress) {
            where.creatorAddress = creatorAddress;
        }

        const queryBuilder = this.questRepository.createQueryBuilder('quest');

        if (status) {
            queryBuilder.andWhere('quest.status = :status', { status });
        }

        if (creatorAddress) {
            queryBuilder.andWhere('quest.creatorAddress = :creatorAddress', {
                creatorAddress,
            });
        }

        if (minReward !== undefined) {
            queryBuilder.andWhere('quest.reward >= :minReward', { minReward });
        }

        if (maxReward !== undefined) {
            queryBuilder.andWhere('quest.reward <= :maxReward', { maxReward });
        }

        const allowedSortFields = [
            'createdAt',
            'updatedAt',
            'title',
            'reward',
            'status',
        ];
        const sortField = allowedSortFields.includes(sortBy)
            ? sortBy
            : 'createdAt';

        queryBuilder.orderBy(`quest.${sortField}`, sortOrder);

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);

        const [quests, total] = await queryBuilder.getManyAndCount();

        return {
            data: quests.map((quest) => QuestResponseDto.fromEntity(quest)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<QuestResponseDto> {
        const quest = await this.questRepository.findOne({ where: { id } });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${id} not found`);
        }

        return QuestResponseDto.fromEntity(quest);
    }

    async update(
        id: string,
        updateQuestDto: UpdateQuestDto,
        userAddress: string,
    ): Promise<QuestResponseDto> {
        const quest = await this.questRepository.findOne({ where: { id } });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${id} not found`);
        }

        if (quest.creatorAddress !== userAddress) {
            throw new ForbiddenException(
                'You can only update quests you created',
            );
        }

        if (updateQuestDto.status && updateQuestDto.status !== quest.status) {
            this.validateStatusTransition(quest.status, updateQuestDto.status);
        }

        if (updateQuestDto.startDate && updateQuestDto.endDate) {
            if (updateQuestDto.endDate <= updateQuestDto.startDate) {
                throw new BadRequestException(
                    'End date must be after start date',
                );
            }
        }

        Object.assign(quest, updateQuestDto);
        const updatedQuest = await this.questRepository.save(quest);

        return QuestResponseDto.fromEntity(updatedQuest);
    }

    async remove(id: string, userAddress: string): Promise<void> {
        const quest = await this.questRepository.findOne({ where: { id } });

        if (!quest) {
            throw new NotFoundException(`Quest with ID ${id} not found`);
        }

        if (quest.creatorAddress !== userAddress) {
            throw new ForbiddenException(
                'You can only delete quests you created',
            );
        }

        await this.questRepository.remove(quest);
    }

    validateStatusTransition(
        currentStatus: QuestStatus,
        newStatus: QuestStatus,
    ): void {
        const validTransitions: Record<QuestStatus, QuestStatus[]> = {
            [QuestStatus.DRAFT]: [QuestStatus.ACTIVE, QuestStatus.ARCHIVED],
            [QuestStatus.ACTIVE]: [
                QuestStatus.COMPLETED,
                QuestStatus.ARCHIVED,
            ],
            [QuestStatus.COMPLETED]: [QuestStatus.ARCHIVED],
            [QuestStatus.ARCHIVED]: [],
        };

        const allowedStatuses = validTransitions[currentStatus];

        if (!allowedStatuses.includes(newStatus)) {
            throw new BadRequestException(
                `Cannot transition from ${currentStatus} to ${newStatus}`,
            );
        }
    }
}
