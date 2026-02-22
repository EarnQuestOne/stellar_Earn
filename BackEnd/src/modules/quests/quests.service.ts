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

import {
  QuestResponseDto,
  PaginatedQuestsResponseDto,
} from './dto/quest-response.dto';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.config';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestCreatedEvent } from '../../events/dto/quest-created.event';
import { QuestDeletedEvent } from '../../events/dto/quest-deleted.event';

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(
    createQuestDto: CreateQuestDto,
    creatorAddress: string,
  ): Promise<QuestResponseDto> {
    if (createQuestDto.startDate && createQuestDto.endDate) {
      if (createQuestDto.endDate <= createQuestDto.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const quest = this.questRepository.create({
      ...createQuestDto,
      createdBy: creatorAddress,
    });

    const savedQuest = await this.questRepository.save(quest);

    // Emit quest created event
    this.eventEmitter.emit(
      'quest.created',
      new QuestCreatedEvent(
        savedQuest.id,
        savedQuest.title,
        savedQuest.createdBy,
        savedQuest.rewardAmount.toString(),
      ),
    );

    // Invalidate quest list cache
    await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);

    return QuestResponseDto.fromEntity(savedQuest);
  }

  async findAll(queryDto: QueryQuestsDto): Promise<PaginatedQuestsResponseDto> {
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

    // Generate cache key based on query parameters
    const cacheKey = `${CACHE_KEYS.QUESTS}:${JSON.stringify({
      status,
      creatorAddress,
      minReward,
      maxReward,
      page,
      limit,
      sortBy,
      sortOrder,
    })}`;

    // Try to get from cache first
    const cached =
      await this.cacheService.get<PaginatedQuestsResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const where: FindOptionsWhere<Quest> = {};

    if (status) {
      where.status = status;
    }

    if (creatorAddress) {
      where.createdBy = creatorAddress;
    }

    const queryBuilder = this.questRepository.createQueryBuilder('quest');

    if (status) {
      queryBuilder.andWhere('quest.status = :status', { status });
    }

    if (creatorAddress) {
      queryBuilder.andWhere('quest.createdBy = :creatorAddress', {
        creatorAddress,
      });
    }

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'title',
      'rewardAmount',
      'status',
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    queryBuilder.orderBy(`quest.${sortField}`, sortOrder);

    if (minReward !== undefined) {
      queryBuilder.andWhere('quest.rewardAmount >= :minReward', { minReward });
    }

    if (maxReward !== undefined) {
      queryBuilder.andWhere('quest.rewardAmount <= :maxReward', { maxReward });
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [quests, total] = await queryBuilder.getManyAndCount();

    const result = {
      data: quests.map((quest) => QuestResponseDto.fromEntity(quest)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    await this.cacheService.set(
      cacheKey,
      result,
      CACHE_TTL.MEDIUM * 1000,
    );

    return result;
  }

  async findOne(id: string): Promise<QuestResponseDto> {
    const cacheKey = `${CACHE_KEYS.QUEST_DETAIL}:${id}`;

    // Try to get from cache first
    const cached =
      await this.cacheService.get<QuestResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const quest = await this.questRepository.findOne({ where: { id } });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    const result = QuestResponseDto.fromEntity(quest);

    // Cache the result
    await this.cacheService.set(cacheKey, result, CACHE_TTL.LONG * 1000);

    return result;
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

    if (quest.createdBy !== userAddress) {
      throw new ForbiddenException('You can only update quests you created');
    }

    if (updateQuestDto.status && updateQuestDto.status !== quest.status) {
      this.validateStatusTransition(quest.status, updateQuestDto.status);
    }

    if (updateQuestDto.startDate && updateQuestDto.endDate) {
      if (updateQuestDto.endDate <= updateQuestDto.startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    Object.assign(quest, updateQuestDto);
    const updatedQuest = await this.questRepository.save(quest);

    // Invalidate caches
    await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);
    await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);

    return QuestResponseDto.fromEntity(updatedQuest);
  }

  async remove(id: string, userAddress: string): Promise<void> {
    const quest = await this.questRepository.findOne({ where: { id } });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    if (quest.createdBy !== userAddress) {
      throw new ForbiddenException('You can only delete quests you created');
    }

    await this.questRepository.remove(quest);

    // Emit quest deleted event
    this.eventEmitter.emit(
      'quest.deleted',
      new QuestDeletedEvent(id, quest.createdBy),
    );

    // Invalidate caches
    await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);
    await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);
  }

  validateStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): void {
    const validTransitions: Record<string, string[]> = {
      'DRAFT': ['ACTIVE', 'ARCHIVED'],
      'ACTIVE': ['COMPLETED', 'ARCHIVED'],
      'COMPLETED': ['ARCHIVED'],
      'ARCHIVED': [],
    };

    const allowedStatuses = validTransitions[currentStatus];

    if (!allowedStatuses?.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
