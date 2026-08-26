import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUrl,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';
import { WEBHOOK_OUTBOUND_EVENT_CATALOG } from '../webhooks-outbound.constants';

/** Selection values a subscription may carry. `*` = whole catalog. */
const SELECTABLE = [...WEBHOOK_OUTBOUND_EVENT_CATALOG];

export class CreateWebhookSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  targetUrl: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(32)
  @IsIn(SELECTABLE, { each: true })
  eventTypes: string[];
}

export class UpdateWebhookSubscriptionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  targetUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(32)
  @IsIn(SELECTABLE, { each: true })
  eventTypes?: string[];

  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused'])
  state?: 'active' | 'paused';
}

export class SendTestEventDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  eventType?: string;
}
