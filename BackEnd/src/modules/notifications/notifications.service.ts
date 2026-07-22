import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
  ) {}

  // Minimal implementation for server startup
  async getUnreadCount(_userId: string): Promise<{ unreadCount: number }> {
    return { unreadCount: 0 };
  }
}
