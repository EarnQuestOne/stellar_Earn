import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
  private statsCache: { data: any; expiresAt: number } | null = null;
  private readonly STATS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getUsers(page: number, limit: number) {
    const [users, total] = await this.userRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { users, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async getPlatformStats() {
    const now = Date.now();
    if (this.statsCache && now < this.statsCache.expiresAt) {
      return this.statsCache.data;
    }

    const totalUsers = await this.userRepo.count();
    const adminCount = await this.userRepo.count({
      where: { role: Role.ADMIN },
    });
    const data = { totalUsers, adminCount };
    this.statsCache = { data, expiresAt: now + this.STATS_CACHE_TTL_MS };
    return data;
  }
}
