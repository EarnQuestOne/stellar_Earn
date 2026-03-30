export class BaseEvent {
    id: string;
    timestamp: Date;
    userId?: string;
    metadata?: Record<string, any>;
  }