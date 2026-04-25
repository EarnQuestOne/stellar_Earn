import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  async logAudit(metadata: {
    userId?: string;
    action: string;
    resource: string;
    details?: any;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    this.logger.log(`AUDIT: ${metadata.action} on ${metadata.resource} by ${metadata.userId || 'anonymous'}`, {
      userId: metadata.userId,
      action: metadata.action,
      resource: metadata.resource,
      details: metadata.details,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }
}
