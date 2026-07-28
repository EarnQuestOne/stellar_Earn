import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

@Injectable()
export class AdminService {
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
      throw new ForbiddenException('User not found');
    }
    return user;
  }

  async getPlatformStats() {
    const totalUsers = await this.userRepo.count();
    const adminCount = await this.userRepo.count({
      where: { role: Role.ADMIN },
    });
    return { totalUsers, adminCount };
  }
}

