import { Injectable } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { CacheService } from '../modules/cache/cache.service';
import { CacheKeys, CacheTags, CacheTtl } from '../modules/cache/cache-tags';

@Injectable()
export class QuestsService {
  constructor(private readonly cacheService: CacheService) {}

  async create(createQuestDto: CreateQuestDto) {
    const created = { id: 'generated-uuid', ...createQuestDto };
    // A new quest changes the listing — drop every cached quest list.
    await this.cacheService.invalidateTag(CacheTags.questList());
    return created;
  }

  async findAll() {
    // Cache-aside read: served from cache until a quest write invalidates the
    // `quest:list` tag (#2159).
    return this.cacheService.getOrSet(
      CacheKeys.questList(),
      CacheTtl.questList,
      [CacheTags.questList()],
      () => Promise.resolve([]),
    );
  }

  async findOne(id: string) {
    return this.cacheService.getOrSet(
      CacheKeys.questById(id),
      CacheTtl.quest,
      [CacheTags.quest(id)],
      () => Promise.resolve({ id, title: 'Sample Quest' }),
    );
  }

  async update(id: string, updateQuestDto: UpdateQuestDto) {
    const updated = { id, ...updateQuestDto };
    await this.cacheService.invalidateTag(CacheTags.quest(id));
    await this.cacheService.invalidateTag(CacheTags.questList());
    return updated;
  }

  async remove(id: string) {
    await this.cacheService.invalidateTag(CacheTags.quest(id));
    await this.cacheService.invalidateTag(CacheTags.questList());
    return { id, deleted: true };
  }
}
