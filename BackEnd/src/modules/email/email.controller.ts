import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendEmailDto, UnsubscribeDto } from './dto/email.dto';

@ApiTags('email')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send an email' })
  @ApiResponse({ status: 201, description: 'Email queued for delivery' })
  @ApiResponse({ status: 400, description: 'Invalid email data' })
  async sendEmail(@Body() dto: SendEmailDto) {
    const result = await this.emailService.queueEmail(dto);
    return {
      success: true,
      messageId: result.messageId,
      status: result.status,
    };
  }

  @Get('status/:messageId')
  @ApiOperation({ summary: 'Get email delivery status' })
  @ApiParam({ name: 'messageId', description: 'Email message ID' })
  @ApiResponse({ status: 200, description: 'Delivery status' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  getDeliveryStatus(@Param('messageId') messageId: string) {
    const status = this.emailService.getDeliveryStatus(messageId);
    if (!status) {
      throw new BadRequestException(`Message ${messageId} not found`);
    }
    return status;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get email delivery statistics' })
  @ApiResponse({ status: 200, description: 'Delivery statistics' })
  getDeliveryStats() {
    return this.emailService.getDeliveryStats();
  }

  @Get('history')
  @ApiOperation({ summary: 'Get email delivery history' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Delivery history' })
  getDeliveryHistory(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    return this.emailService.getAllDeliveryStatuses(parsedLimit);
  }

  @Post('webhook/sendgrid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SendGrid webhook endpoint for delivery events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  handleSendGridWebhook(
    @Body() events: Array<Record<string, any>>,
    @Headers('x-twilio-email-event-webhook-signature') signature?: string,
    @Headers('x-twilio-email-event-webhook-timestamp') timestamp?: string,
  ) {
    if (signature && timestamp) {
      const isValid = this.emailService.verifyWebhookSignature(
        JSON.stringify(events),
        signature,
        timestamp,
      );

      if (!isValid) {
        this.logger.warn('Invalid SendGrid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    this.emailService.handleWebhookEvent(events);
    return { received: true };
  }

  @Get('unsubscribe')
  @ApiOperation({ summary: 'Process unsubscribe request from email link' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Unsubscribe processed' })
  @ApiResponse({ status: 400, description: 'Invalid unsubscribe token' })
  processUnsubscribe(@Query('token') token: string) {
    if (!token) {
      throw new BadRequestException('Unsubscribe token is required');
    }

    const result = this.emailService.processUnsubscribeToken(token);

    if (!result.success) {
      throw new BadRequestException('Invalid or expired unsubscribe token');
    }

    return {
      success: true,
      message: 'You have been successfully unsubscribed from email notifications.',
    };
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe from email notifications' })
  @ApiResponse({ status: 200, description: 'Unsubscribed' })
  unsubscribe(@Body() dto: UnsubscribeDto) {
    const result = this.emailService.processUnsubscribeToken(dto.token);

    if (!result.success) {
      throw new BadRequestException('Invalid unsubscribe token');
    }

    return {
      success: true,
      message: 'You have been successfully unsubscribed.',
    };
  }

  @Post('resubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resubscribe to email notifications' })
  @ApiResponse({ status: 200, description: 'Resubscribed' })
  resubscribe(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const removed = this.emailService.removeFromUnsubscribeList(email);
    return {
      success: removed,
      message: removed
        ? 'You have been resubscribed to email notifications.'
        : 'This email was not on the unsubscribe list.',
    };
  }
}
