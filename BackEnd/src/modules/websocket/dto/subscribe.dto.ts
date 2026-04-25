import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WsChannel } from '../entities/ws-subscription.entity';

export class SubscribeDto {
  @IsEnum(WsChannel)
  channel: WsChannel;

  @IsString()
  @IsOptional()
  resourceId?: string;
}

export class UnsubscribeDto {
  @IsEnum(WsChannel)
  channel: WsChannel;

  @IsString()
  @IsOptional()
  resourceId?: string;
}
