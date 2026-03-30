import { Notification } from '../entities/notification.entity';

export enum ChannelType {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
  WEBHOOK = 'WEBHOOK',
  SMS = 'SMS',
}

export interface DeliveryResult {
  success: boolean;
  channel: ChannelType;
  providerResponse?: any;
  error?: string;
  retryable?: boolean;
}

export interface NotificationChannel {
  type: ChannelType;
  send(notification: Notification, recipient: any): Promise<DeliveryResult>;
}
