import { Injectable, Logger } from '@nestjs/common';
import { GithubHandler } from './handlers/github.handler';
import { ApiHandler } from './handlers/api.handler';
import { verifyWebhookSignature } from './utils/signature';

export interface WebhookEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  signature?: string;
  secret?: string;
}

export interface WebhookResponse {
  success: boolean;
  eventId: string;
  message: string;
  processedAt: Date;
  data?: any;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly githubHandler: GithubHandler,
    private readonly apiHandler: ApiHandler,
  ) {}

  async processWebhook(event: WebhookEvent): Promise<WebhookResponse> {
    try {
      this.logger.log(`Processing webhook event ${event.id} of type ${event.type} from ${event.source}`);

      // Verify signature if present
      if (event.signature && event.secret) {
        const isValid = verifyWebhookSignature(
          event.payload,
          event.signature,
          event.secret,
          event.source
        );
        
        if (!isValid) {
          this.logger.warn(`Invalid signature for webhook ${event.id}`);
          return {
            success: false,
            eventId: event.id,
            message: 'Invalid webhook signature',
            processedAt: new Date(),
          };
        }
      }

      let result: any;

      // Route to appropriate handler based on source
      switch (event.source.toLowerCase()) {
        case 'github':
          result = await this.githubHandler.handleEvent(event);
          break;
        case 'api':
          result = await this.apiHandler.handleEvent(event);
          break;
        default:
          this.logger.warn(`Unsupported webhook source: ${event.source}`);
          return {
            success: false,
            eventId: event.id,
            message: `Unsupported webhook source: ${event.source}`,
            processedAt: new Date(),
          };
      }

      this.logger.log(`Successfully processed webhook ${event.id}`);
      
      return {
        success: true,
        eventId: event.id,
        message: 'Webhook processed successfully',
        processedAt: new Date(),
        data: result,
      };

    } catch (error) {
      this.logger.error(`Failed to process webhook ${event.id}:`, error.stack);
      return {
        success: false,
        eventId: event.id,
        message: `Failed to process webhook: ${error.message}`,
        processedAt: new Date(),
      };
    }
  }

  async retryFailedWebhook(eventId: string, maxRetries = 3): Promise<boolean> {
    this.logger.log(`Attempting to retry webhook ${eventId}`);
    
    // In a real implementation, you would:
    // 1. Retrieve the failed webhook from database
    // 2. Increment retry count
    // 3. Process again with exponential backoff
    // 4. Update status in database
    
    // For now, returning true to indicate retry mechanism exists
    return true;
  }

  getSupportedSources(): string[] {
    return ['github', 'api'];
  }
}