import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quest } from '../../quests/entities/quest.entity';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

interface RequestUser {
  id: string;
  stellarAddress: string;
  role: UserRole;
}

interface AuthenticatedRequest {
  user: RequestUser;
  params: {
    questId: string;
  };
}

@Injectable()
export class VerifierGuard implements CanActivate {
  constructor(
    @InjectRepository(Quest)
    private questRepository: Repository<Quest>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const questId = request.params.questId;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!questId) {
      throw new BadRequestException('Quest ID is required');
    }

    // Admins can verify any submission
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const quest = await this.questRepository.findOne({
      where: { id: questId },
      relations: ['verifiers', 'creator'],
    });

    if (!quest) {
      throw new BadRequestException('Quest not found');
    }

    const isVerifier = quest.verifiers?.some(
      (v: { id: string }) => v.id === user.id,
    );
    const isCreator = quest.creator?.id === user.id;

    if (!isVerifier && !isCreator) {
      throw new ForbiddenException(
        'You are not authorized to verify submissions for this quest',
      );
    }

    return true;
  }
}
