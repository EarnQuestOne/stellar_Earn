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
  QuestCreatedEvent,
  QuestUpdatedEvent,
  QuestDeletedEvent,
} from './dto';
import { CacheService } from '../cache/cache.service';
import { CACHE_KEYS, CACHE_TTL } from '../../config/cache.config';

import { EventEmitter2 } from '@nestjs/event-emitter';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class QuestsService {
  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2,
    private readonly moderationService: ModerationService,
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

    const scan = await this.moderationService.scanText(
      `${createQuestDto.title}\n\n${createQuestDto.description}`,
    );
    if (scan.shouldBlock) {
      throw new BadRequestException({
        message: 'Content violates platform moderation rules',
        code: 'MODERATION_BLOCKED',
        keywordHits: scan.keywordHits,
      });
    }

    const savedQuest = await this.questRepository.save(quest);

    await this.moderationService.saveQuestModerationItem(
      savedQuest.id,
      creatorAddress,
      savedQuest.title,
      savedQuest.description,
      scan,
    );

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
    cursor,
    limit = 10,
  } = queryDto;

  // Updated cache key (removed page-based params)
  const cacheKey = `${CACHE_KEYS.QUESTS}:${JSON.stringify({
    status,
    creatorAddress,
    minReward,
    maxReward,
    cursor,
    limit,
  })}`;

  const cached =
    await this.cacheService.get<PaginatedQuestsResponseDto>(cacheKey);
  if (cached) {
    return cached;
  }

  const queryBuilder = this.questRepository.createQueryBuilder('quest');

  // Filters
  if (status) {
    queryBuilder.andWhere('quest.status = :status', { status });
  }

  if (creatorAddress) {
    queryBuilder.andWhere('quest.createdBy = :creatorAddress', {
      creatorAddress,
    });
  }

  if (minReward !== undefined) {
    queryBuilder.andWhere('quest.rewardAmount >= :minReward', { minReward });
  }

  if (maxReward !== undefined) {
    queryBuilder.andWhere('quest.rewardAmount <= :maxReward', { maxReward });
  }

  // ⚠️ Force consistent ordering for cursor pagination
  queryBuilder.orderBy('quest.createdAt', 'DESC');

  // Cursor condition
  if (cursor) {
    queryBuilder.andWhere('quest.createdAt < :cursor', { cursor });
  }

  // Fetch one extra record to determine if there's a next page
  queryBuilder.take(limit + 1);

  const quests = await queryBuilder.getMany();

  const hasNextPage = quests.length > limit;

  const data = hasNextPage ? quests.slice(0, -1) : quests;

  const nextCursor = hasNextPage
    ? data[data.length - 1].createdAt
    : null;

  const result: PaginatedQuestsResponseDto = {
    data: data.map((quest) => QuestResponseDto.fromEntity(quest)),
    nextCursor,
    limit,
  };

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

    const quest = await this.questRepository.findOne({ 
      where: { id },
      withDeleted: false,
    });

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
    const quest = await this.questRepository.findOne({ 
      where: { id },
      withDeleted: false,
    });

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

    const nextTitle = updateQuestDto.title ?? quest.title;
    const nextDesc = updateQuestDto.description ?? quest.description;
    const scan = await this.moderationService.scanText(
      `${nextTitle}\n\n${nextDesc}`,
    );
    if (scan.shouldBlock) {
      throw new BadRequestException({
        message: 'Content violates platform moderation rules',
        code: 'MODERATION_BLOCKED',
        keywordHits: scan.keywordHits,
      });
    }

    Object.assign(quest, updateQuestDto);
    const updatedQuest = await this.questRepository.save(quest);

    await this.moderationService.saveQuestModerationItem(
      updatedQuest.id,
      userAddress,
      updatedQuest.title,
      updatedQuest.description,
      scan,
    );

    // Emit quest updated event
    this.eventEmitter.emit(
      'quest.updated',
      new QuestUpdatedEvent(id, updateQuestDto as any),
    );

    // Invalidate caches
    await this.cacheService.deletePattern(CACHE_KEYS.QUESTS);
    await this.cacheService.delete(`${CACHE_KEYS.QUEST_DETAIL}:${id}`);

    // Emit quest updated event
    this.eventEmitter.emit('quest.updated', {
      questId: id,
      changes: updateQuestDto,
      updatedAt: new Date(),
    });

    return QuestResponseDto.fromEntity(updatedQuest);
  }

  async remove(id: string, userAddress: string): Promise<void> {
    const quest = await this.questRepository.findOne({ 
      where: { id },
      withDeleted: false,
    });

    if (!quest) {
      throw new NotFoundException(`Quest with ID ${id} not found`);
    }

    if (quest.createdBy !== userAddress) {
      throw new ForbiddenException('You can only delete quests you created');
    }

    // Soft delete the quest
    await this.questRepository.softDelete(quest.id);

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
