import { IsEnum, IsArray, IsBoolean } from 'class-validator';
import { NotificationType } from '../entities/notification.entity';
import { ChannelType } from '../channels/notification-channel.interface';

export class UpdatePreferenceDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsArray()
  @IsEnum(ChannelType, { each: true })
  enabledChannels: ChannelType[];

  @IsBoolean()
  enabled: boolean;
}
