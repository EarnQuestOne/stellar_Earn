import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLog, DeliveryStatus } from './entities/notification-log.entity';
import { ChannelType } from './channels/notification-channel.interface';

@Injectable()
export class NotificationAnalyticsService {
  constructor(
    @InjectRepository(NotificationLog)
    private logsRepository: Repository<NotificationLog>,
  ) {}

  async getDeliveryStats(userId?: string) {
    const query = this.logsRepository.createQueryBuilder('log');
    
    if (userId) {
      query.innerJoin('log.notification', 'notification')
           .where('notification.userId = :userId', { userId });
    }

    const stats = await query
      .select('log.channel', 'channel')
      .addSelect('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.channel')
      .addGroupBy('log.status')
      .getRawMany();

    return stats;
  }

  async getChannelSuccessRate(channel: ChannelType) {
    const total = await this.logsRepository.count({ where: { channel } });
    const success = await this.logsRepository.count({ 
      where: { channel, status: DeliveryStatus.SENT } 
    });

    return total > 0 ? (success / total) * 100 : 0;
  }
}
