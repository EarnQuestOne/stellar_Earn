import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum EmailPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

export enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  FAILED = 'failed',
  DROPPED = 'dropped',
  DEFERRED = 'deferred',
  OPENED = 'opened',
  CLICKED = 'clicked',
  SPAM_REPORT = 'spam_report',
  UNSUBSCRIBED = 'unsubscribed',
}

export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  QUEST_COMPLETED = 'quest_completed',
  SUBMISSION_APPROVED = 'submission_approved',
  SUBMISSION_REJECTED = 'submission_rejected',
  PAYOUT_PROCESSED = 'payout_processed',
  PAYOUT_FAILED = 'payout_failed',
  ACCOUNT_UPDATE = 'account_update',
  GENERAL_NOTIFICATION = 'general_notification',
}

export class EmailRecipientDto {
  @ApiProperty({ description: 'Recipient email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ description: 'Recipient name' })
  @IsString()
  @IsOptional()
  name?: string;
}

export class SendEmailDto {
  @ApiProperty({ description: 'Recipient(s)', type: [EmailRecipientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmailRecipientDto)
  to: EmailRecipientDto[];

  @ApiProperty({ description: 'Email subject line' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Email template to use', enum: EmailTemplate })
  @IsEnum(EmailTemplate)
  @IsOptional()
  template?: EmailTemplate;

  @ApiPropertyOptional({ description: 'Template variables for dynamic content' })
  @IsObject()
  @IsOptional()
  templateData?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Plain text body (used if no template)' })
  @IsString()
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({ description: 'HTML body (used if no template)' })
  @IsString()
  @IsOptional()
  html?: string;

  @ApiPropertyOptional({ description: 'Email priority', enum: EmailPriority })
  @IsEnum(EmailPriority)
  @IsOptional()
  priority?: EmailPriority;
}

export class EmailDeliveryStatusDto {
  @ApiProperty()
  messageId: string;

  @ApiProperty({ enum: EmailStatus })
  status: EmailStatus;

  @ApiProperty()
  recipient: string;

  @ApiProperty()
  timestamp: Date;

  @ApiPropertyOptional()
  reason?: string;
}

export class EmailWebhookEventDto {
  @IsString()
  @IsNotEmpty()
  event: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  sg_message_id?: string;

  @IsOptional()
  timestamp?: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  bounce_classification?: string;
}

export class UnsubscribeDto {
  @ApiProperty({ description: 'Unsubscribe token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
