import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';

@Injectable()
export class QuestsService {
  async create(createQuestDto: CreateQuestDto) {
    return { id: 'generated-uuid', ...createQuestDto };
  }

  async findAll() {
    return [];
  }

  async findOne(id: string) {
    return { id, title: 'Sample Quest' };
  }

  async update(id: string, updateQuestDto: UpdateQuestDto) {
    return { id, ...updateQuestDto };
  }

  async remove(id: string) {
    return { id, deleted: true };
  }
}