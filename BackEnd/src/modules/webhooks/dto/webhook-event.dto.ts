import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum WebhookEventType {
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  QUEST_COMPLETED = 'QUEST_COMPLETED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
}

export class WebhookDataDto {
  @IsString()
  @IsNotEmpty()
  transactionHash!: string;

  @IsString()
  @IsNotEmpty()
  sourceAccount!: string;

  @IsOptional()
  @IsString()
  amount?: string;
}

export class WebhookPayloadDto {
  @IsString()
  @IsNotEmpty()
  eventId!: string;

  @IsEnum(WebhookEventType)
  eventType!: WebhookEventType;

  @IsObject()
  @ValidateNested()
  @Type(() => WebhookDataDto)
  data!: WebhookDataDto;
}
