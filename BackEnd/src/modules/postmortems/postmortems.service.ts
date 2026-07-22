import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { PostmortemEntity, PostmortemStatus } from './postmortems.entity';
import {
  CreatePostmortemDto,
  UpdatePostmortemDto,
  PostmortemResponseDto,
  PostmortemQueryDto,
  PostmortemStatsDto,
} from './dto/postmortem.dto';

@Injectable()
export class PostmortemService {
  constructor(
    @InjectRepository(PostmortemEntity)
    private postmortemRepository: Repository<PostmortemEntity>,
  ) {}

  /**
   * Create a new postmortem
   */
  async create(dto: CreatePostmortemDto): Promise<PostmortemResponseDto> {
    // Validate incident ID format (YYYY-MM-DD-HHMM)
    if (!this.isValidIncidentId(dto.incidentId)) {
      throw new BadRequestException(
        'Invalid incident ID format. Use YYYY-MM-DD-HHMM',
      );
    }

    // Check if postmortem already exists
    const existing = await this.postmortemRepository.findOne({
      where: { incidentId: dto.incidentId },
    });

    if (existing) {
      throw new BadRequestException(
        `Postmortem for incident ${dto.incidentId} already exists`,
      );
    }

    // Calculate duration
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );

    if (durationMinutes < 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const postmortem = this.postmortemRepository.create({
      ...dto,
      durationMinutes,
      servicesAffected: JSON.stringify(dto.servicesAffected || []),
      contributingFactors: JSON.stringify(dto.contributingFactors || []),
      actionItems: JSON.stringify([]),
      totalActionItems: 0,
      completedActionItems: 0,
    });

    const saved = await this.postmortemRepository.save(postmortem);
    return this.toResponseDto(saved);
  }

  /**
   * Get postmortem by ID
   */
  async getById(id: string): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    return this.toResponseDto(postmortem);
  }

  /**
   * Get postmortem by incident ID
   */
  async getByIncidentId(incidentId: string): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { incidentId },
    });

    if (!postmortem) {
      throw new NotFoundException(
        `Postmortem not found for incident: ${incidentId}`,
      );
    }

    return this.toResponseDto(postmortem);
  }

  /**
   * List postmortems with filtering and pagination
   */
  async list(query: PostmortemQueryDto): Promise<{
    data: PostmortemResponseDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(query.limit || 20, 100);
    const offset = query.offset || 0;

    const where: FindOptionsWhere<PostmortemEntity> = {};

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.searchTerm) {
      // Search in title, summary, and incident ID
      where.title = ILike(`%${query.searchTerm}%`);
    }

    const [postmortems, total] = await this.postmortemRepository.findAndCount({
      where,
      take: limit,
      skip: offset,
      order: {
        [query.sortBy || 'createdAt']: query.sortOrder || 'DESC',
      },
    });

    return {
      data: postmortems.map((p) => this.toResponseDto(p)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Update postmortem
   */
  async update(
    id: string,
    dto: UpdatePostmortemDto,
  ): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    // Don't allow status changes if there are incomplete action items
    if (
      dto.status === PostmortemStatus.CLOSED &&
      postmortem.completedActionItems < postmortem.totalActionItems
    ) {
      throw new BadRequestException(
        'Cannot close postmortem with incomplete action items',
      );
    }

    // Update fields
    if (dto.title) postmortem.title = dto.title;
    if (dto.summary) postmortem.summary = dto.summary;
    if (dto.rootCause) postmortem.rootCause = dto.rootCause;
    if (dto.whatWentWell)
      postmortem.whatWentWell = JSON.stringify(dto.whatWentWell);
    if (dto.whatWentWrong)
      postmortem.whatWentWrong = JSON.stringify(dto.whatWentWrong);
    if (dto.lessonsLearned)
      postmortem.lessonsLearned = JSON.stringify(dto.lessonsLearned);
    if (dto.actionItems) {
      postmortem.actionItems = JSON.stringify(dto.actionItems);
      postmortem.totalActionItems = dto.actionItems.length;
      postmortem.completedActionItems = 0; // Reset when updating
    }
    if (dto.status) postmortem.status = dto.status;
    if (dto.facilitator) postmortem.facilitator = dto.facilitator;
    if (dto.attendees) postmortem.attendees = JSON.stringify(dto.attendees);
    if (dto.isPublished !== undefined) postmortem.isPublished = dto.isPublished;
    if (dto.tags) postmortem.tags = JSON.stringify(dto.tags);

    if (dto.status === PostmortemStatus.CLOSED) {
      postmortem.closedAt = new Date();
    }

    const updated = await this.postmortemRepository.save(postmortem);
    return this.toResponseDto(updated);
  }

  /**
   * Add action item to postmortem
   */
  async addActionItem(
    id: string,
    actionItem: {
      action: string;
      owner: string;
      dueDate: Date;
      priority: 'P0' | 'P1' | 'P2' | 'P3';
    },
  ): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    const items = JSON.parse(postmortem.actionItems || '[]');
    const newItem = {
      id: `A${items.length + 1}`,
      ...actionItem,
      status: 'not_started',
    };
    items.push(newItem);

    postmortem.actionItems = JSON.stringify(items);
    postmortem.totalActionItems = items.length;

    const updated = await this.postmortemRepository.save(postmortem);
    return this.toResponseDto(updated);
  }

  /**
   * Mark action item as complete
   */
  async completeActionItem(
    id: string,
    actionItemId: string,
  ): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    const items = JSON.parse(postmortem.actionItems || '[]');
    const item = items.find((i: any) => i.id === actionItemId);

    if (!item) {
      throw new NotFoundException(`Action item not found: ${actionItemId}`);
    }

    item.status = 'completed';
    item.completedAt = new Date();

    postmortem.actionItems = JSON.stringify(items);
    postmortem.completedActionItems = items.filter(
      (i: any) => i.status === 'completed',
    ).length;

    const updated = await this.postmortemRepository.save(postmortem);
    return this.toResponseDto(updated);
  }

  /**
   * Get postmortem statistics
   */
  async getStatistics(): Promise<PostmortemStatsDto> {
    const postmortems = await this.postmortemRepository.find();

    const stats: PostmortemStatsDto = {
      totalPostmortems: postmortems.length,
      byStatus: {},
      bySeverity: {},
      averageTTD: 0,
      averageTTM: 0,
      averageTTR: 0,
      actionItemCompletionRate: 0,
      mostCommonRootCauses: [],
      recentIncidents: [],
    };

    // Count by status and severity
    postmortems.forEach((p) => {
      stats.byStatus[p.status] = (stats.byStatus[p.status] || 0) + 1;
      stats.bySeverity[p.severity] = (stats.bySeverity[p.severity] || 0) + 1;
    });

    // Calculate averages
    const validTTD = postmortems.filter((p) => p.ttd !== null);
    const validTTM = postmortems.filter((p) => p.ttm !== null);
    const validTTR = postmortems.filter((p) => p.ttr !== null);

    if (validTTD.length > 0) {
      stats.averageTTD = Math.round(
        validTTD.reduce((sum, p) => sum + (p.ttd || 0), 0) / validTTD.length,
      );
    }

    if (validTTM.length > 0) {
      stats.averageTTM = Math.round(
        validTTM.reduce((sum, p) => sum + (p.ttm || 0), 0) / validTTM.length,
      );
    }

    if (validTTR.length > 0) {
      stats.averageTTR = Math.round(
        validTTR.reduce((sum, p) => sum + (p.ttr || 0), 0) / validTTR.length,
      );
    }

    // Calculate action item completion rate
    const totalItems = postmortems.reduce(
      (sum, p) => sum + p.totalActionItems,
      0,
    );
    const completedItems = postmortems.reduce(
      (sum, p) => sum + p.completedActionItems,
      0,
    );
    stats.actionItemCompletionRate =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Find most common root causes
    const rootCauseCounts: Record<string, number> = {};
    postmortems.forEach((p) => {
      if (p.rootCause) {
        rootCauseCounts[p.rootCause] = (rootCauseCounts[p.rootCause] || 0) + 1;
      }
    });

    stats.mostCommonRootCauses = Object.entries(rootCauseCounts)
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get recent incidents
    stats.recentIncidents = postmortems
      .sort((a, b) => b.incidentDate.getTime() - a.incidentDate.getTime())
      .slice(0, 10)
      .map((p) => this.toResponseDto(p));

    return stats;
  }

  /**
   * Find related incidents
   */
  async findRelatedIncidents(id: string): Promise<PostmortemResponseDto[]> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    // Find incidents with similar root causes
    const allPostmortems = await this.postmortemRepository.find();
    const related = allPostmortems
      .filter(
        (p) =>
          p.id !== id &&
          p.rootCause &&
          postmortem.rootCause &&
          p.rootCause
            .toLowerCase()
            .includes(postmortem.rootCause.toLowerCase()),
      )
      .slice(0, 5);

    return related.map((p) => this.toResponseDto(p));
  }

  /**
   * Publish postmortem (make visible to all)
   */
  async publish(id: string): Promise<PostmortemResponseDto> {
    const postmortem = await this.postmortemRepository.findOne({
      where: { id },
    });

    if (!postmortem) {
      throw new NotFoundException(`Postmortem not found: ${id}`);
    }

    if (postmortem.status !== PostmortemStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved postmortems can be published',
      );
    }

    postmortem.isPublished = true;
    const updated = await this.postmortemRepository.save(postmortem);
    return this.toResponseDto(updated);
  }

  // ============ Helper Methods ============

  /**
   * Validate incident ID format (YYYY-MM-DD-HHMM)
   */
  private isValidIncidentId(id: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}-\d{4}$/;
    if (!regex.test(id)) return false;

    const [year, month, day, time] = id.split('-');
    const hour = time.substring(0, 2);
    const minute = time.substring(2, 4);

    // Validate ranges
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);

    return (
      y >= 2000 &&
      m >= 1 &&
      m <= 12 &&
      d >= 1 &&
      d <= 31 &&
      h >= 0 &&
      h <= 23 &&
      min >= 0 &&
      min <= 59
    );
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(entity: PostmortemEntity): PostmortemResponseDto {
    return {
      id: entity.id,
      incidentId: entity.incidentId,
      title: entity.title,
      summary: entity.summary || '',
      severity: entity.severity,
      status: entity.status,
      incidentDate: entity.incidentDate,
      startTime: entity.startTime,
      endTime: entity.endTime,
      durationMinutes: entity.durationMinutes,
      usersAffected: entity.usersAffected,
      slaBreached: entity.slaBreached,
      rootCause: entity.rootCause || '',
      whatWentWell: this.parseJson(entity.whatWentWell, []),
      whatWentWrong: this.parseJson(entity.whatWentWrong, []),
      lessonsLearned: this.parseJson(entity.lessonsLearned, {}),
      actionItems: this.parseJson(entity.actionItems, []),
      completedActionItems: entity.completedActionItems,
      totalActionItems: entity.totalActionItems,
      isPublished: entity.isPublished,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Safe JSON parse
   */
  private parseJson<T = any>(json: string | null, fallback: T): T {
    if (!json) return fallback;
    try {
      return JSON.parse(json) as T;
    } catch (_err) {
      return fallback;
    }
  }
}
