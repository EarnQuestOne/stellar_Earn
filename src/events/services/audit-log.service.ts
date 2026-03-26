import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  async log(event: string, data: any): Promise<void> {
    try {
      console.log(`[AUDIT] ${event}:`, data);
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
}