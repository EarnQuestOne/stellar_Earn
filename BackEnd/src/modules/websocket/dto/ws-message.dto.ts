import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { WsChannel } from '../entities/ws-subscription.entity';

export class SendMessageDto {
  @IsEnum(WsChannel)
  channel: WsChannel;

  @IsString()
  @IsNotEmpty()
  event: string;

  @IsObject()
  payload: Record<string, any>;

  @IsString()
  @IsOptional()
  targetUserId?: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class FetchHistoryDto {
  @IsEnum(WsChannel)
  channel: WsChannel;

  @IsOptional()
  @IsString()
  since?: string;

  @IsOptional()
  limit?: number;
}
