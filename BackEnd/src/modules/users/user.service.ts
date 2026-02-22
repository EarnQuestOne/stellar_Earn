import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Quest } from '../quests/entities/quest.entity';
import {
  Submission,
  SubmissionStatus,
} from '../submissions/entities/submission.entity';
import { Payout } from '../payouts/entities/payout.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { SearchUsersDto } from './dto/search-users.dto';
import { UpdateProfileDto } from './dto/update.dto';
import { User, UserRole } from './entities/user.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../../events/dto/user-created.event';
import { UserUpdatedEvent } from '../../events/dto/user-updated.event';

export interface UserStats {
  totalQuests: number;
  completedQuests: number;
  pendingQuests: number;
  failedQuests: number;
  successRate: number;
  totalEarned: string;
  averageCompletionTime: number;
  favoriteQuestCategory?: string;
  streak: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
    stellarAddress: string;
  };
  xp: number;
  level: number;
  completedQuests: number;
  totalEarned: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Quest)
    private questsRepository: Repository<Quest>,
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    @InjectRepository(Payout)
    private payoutsRepository: Repository<Payout>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    this.eventEmitter.emit(
      'user.created',
      new UserCreatedEvent(
        savedUser.id,
        savedUser.username,
        savedUser.email,
        savedUser.stellarAddress,
      ),
    );

    return savedUser;
  }

  async findByAddress(address: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { stellarAddress: address },
      relations: ['createdQuests'],
    });

    if (!user) {
      throw new NotFoundException(`User with address ${address} not found`);
    }

    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException(`User with username ${username} not found`);
    }

    return user;
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserStats(address: string): Promise<UserStats> {
    const cacheKey = `user_stats_${address}`;
    const cached = await this.cacheManager.get<UserStats>(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await this.findByAddress(address);

    // Get all user submissions
    const submissions = await this.submissionsRepository.find({
      where: { user: { id: user.id } },
      relations: ['quest'],
    });

    const completedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.APPROVED,
    );
    const pendingSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.PENDING,
    );
    const failedSubmissions = submissions.filter(
      (s) => s.status === SubmissionStatus.REJECTED,
    );

    // Calculate average completion time
    const completionTimes = completedSubmissions
      .map((s) => {
        const submitted = s.createdAt.getTime();
        const approved = s.approvedAt?.getTime() || submitted;
        return approved - submitted;
      })
      .filter((time) => time > 0);

    const averageCompletionTime =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    const categoryCounts: Record<string, number> = {};

    completedSubmissions.forEach((s) => {
      if (s.quest?.category) {
        categoryCounts[s.quest.category] =
          (categoryCounts[s.quest.category] ?? 0) + 1;
      }
    });

    const favoriteQuestCategory =
      Object.keys(categoryCounts).length > 0
        ? Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0][0]
        : undefined;

    // Calculate streak (consecutive days with at least one completed quest)
    const completedDates = completedSubmissions
      .map((s) => s.approvedAt || s.createdAt)
      .map((date) => date.toISOString().split('T')[0])
      .filter((date, index, self) => self.indexOf(date) === index)
      .sort();

    let streak = 0;
    if (completedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      let currentDate = completedDates[completedDates.length - 1];
      let consecutive = 1;

      for (let i = completedDates.length - 2; i >= 0; i--) {
        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        if (completedDates[i] === prevDateStr) {
          consecutive++;
          currentDate = completedDates[i];
        } else {
          break;
        }
      }

      // Check if streak includes today or yesterday
      const lastDate = new Date(completedDates[completedDates.length - 1]);
      const todayDate = new Date(today);
      const diffDays = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24),
      );

      streak = diffDays <= 1 ? consecutive : 0;
    }

    // Get user rank
    const allUsers = await this.usersRepository.find({
      order: { xp: 'DESC' },
    });
    const rank = allUsers.findIndex((u) => u.id === user.id) + 1;

    const stats: UserStats = {
      totalQuests: submissions.length,
      completedQuests: completedSubmissions.length,
      pendingQuests: pendingSubmissions.length,
      failedQuests: failedSubmissions.length,
      successRate: user.successRate,
      totalEarned: user.totalEarned,
      averageCompletionTime,
      favoriteQuestCategory,
      streak,
      rank,
    };

    await this.cacheManager.set(cacheKey, stats, 60000); // Cache for 1 minute
    return stats;
  }

  async getUserQuests(address: string, page = 1, limit = 20) {
    const user = await this.findByAddress(address);

    const [submissions, total] = await this.submissionsRepository.findAndCount({
      where: { user: { id: user.id } },
      relations: ['quest'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: submissions.map((submission) => ({
        id: submission.id,
        quest: submission.quest,
        status: submission.status,
        submittedAt: submission.createdAt,
        approvedAt: submission.approvedAt,
        proof: submission.proof,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateProfile(
    address: string,
    updateData: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findByAddress(address);

    // Update user fields
    if (updateData.bio !== undefined) user.bio = updateData.bio;
    if (updateData.avatarUrl !== undefined)
      user.avatarUrl = updateData.avatarUrl;
    if (updateData.privacyLevel !== undefined)
      user.privacyLevel = updateData.privacyLevel;
    if (updateData.socialLinks !== undefined)
      user.socialLinks = updateData.socialLinks;

    user.updateStatistics();

    await this.usersRepository.save(user);

    // Collect updated fields
    const updatedFields = Object.keys(updateData);

    // Emit user updated event
    this.eventEmitter.emit(
      'user.updated',
      new UserUpdatedEvent(user.id, updatedFields),
    );

    // Clear cache
    await this.cacheManager.del(`user_stats_${address}`);

    return user;
  }

  async searchUsers(searchDto: SearchUsersDto) {
    const {
      query,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      order = 'DESC',
    } = searchDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<User> = {};

    if (query) {
      where.username = Like(`%${query}%`);
    }

    const [users, total] = await this.usersRepository.findAndCount({
      where,
      order: { [sortBy]: order },
      skip,
      take: limit,
      select: [
        'id',
        'username',
        'avatarUrl',
        'stellarAddress',
        'xp',
        'level',
        'createdAt',
      ],
    });

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLeaderboard(page = 1, limit = 50) {
    const cacheKey = `leaderboard_page_${page}_limit_${limit}`;
    const cached = await this.cacheManager.get<LeaderboardEntry[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const [users] = await this.usersRepository.findAndCount({
      order: { xp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: [
        'id',
        'username',
        'avatarUrl',
        'stellarAddress',
        'xp',
        'level',
        'completedQuests',
        'totalEarned',
      ],
    });

    const leaderboard = users.map((user, index) => ({
      rank: (page - 1) * limit + index + 1,
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        stellarAddress: user.stellarAddress,
      },
      xp: user.xp,
      level: user.level,
      completedQuests: user.completedQuests,
      totalEarned: user.totalEarned,
    }));

    await this.cacheManager.set(cacheKey, leaderboard, 30000); // Cache for 30 seconds
    return leaderboard;
  }

  async updateUserXP(address: string, xpToAdd: number): Promise<User> {
    const user = await this.findByAddress(address);
    user.xp += xpToAdd;
    user.level = user.calculateLevel();

    await this.usersRepository.save(user);

    // Clear leaderboard cache since XP changed
    await this.clearLeaderboardCache();

    return user;
  }

  async updateQuestCompletion(
    address: string,
    success: boolean,
    amount?: string,
  ): Promise<User> {
    const user = await this.findByAddress(address);

    if (success) {
      user.completedQuests += 1;
      // Add XP for completion
      user.xp += 100;
    } else {
      user.failedQuests += 1;
      // Add minimal XP for attempt
      user.xp += 10;
    }

    if (amount) {
      const currentTotal = BigInt(user.totalEarned || '0');
      const newAmount = BigInt(amount);
      user.totalEarned = (currentTotal + newAmount).toString();
    }

    user.successRate = user.calculateSuccessRate();
    user.level = user.calculateLevel();
    user.lastActiveAt = new Date();

    await this.usersRepository.save(user);

    // Clear caches
    await this.cacheManager.del(`user_stats_${address}`);
    await this.clearLeaderboardCache();

    return user;
  }

  private async clearLeaderboardCache() {
    try {
      const currentVersion = Date.now().toString();
      await this.cacheManager.set('leaderboard_version', currentVersion, 0);

      this.logger.debug('Leaderboard cache invalidated with new version');
    } catch (error) {
      this.logger.warn('Could not clear leaderboard cache:', error);
    }
  }

  async getUsersByRole(role: UserRole): Promise<User[]> {
    return this.usersRepository.find({
      where: { role },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteUser(address: string, requestingUser: User): Promise<void> {
    const userToDelete = await this.findByAddress(address);

    // Only allow if requesting user is admin or deleting own account
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.id !== userToDelete.id
    ) {
      throw new BadRequestException('You can only delete your own account');
    }

    await this.usersRepository.remove(userToDelete);

    // Clear caches
    await this.cacheManager.del(`user_stats_${address}`);
    await this.clearLeaderboardCache();
  }
}
