import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { validate } from 'class-validator';

@Injectable()
export class EventAuditListener implements OnModuleInit {
    private readonly logger = new Logger('EventAudit');

    constructor(private eventEmitter: EventEmitter2) { }

    onModuleInit() {
        this.eventEmitter.onAny(async (eventName: string | string[], payload: any) => {
            // eventemitter2 passes name as first arg, andpayload as second
            const name = Array.isArray(eventName) ? eventName.join('.') : eventName;

            // Some events might not be DTOs, so we check construction
            const dtoName = payload?.constructor?.name || 'Object';

            this.logger.log(`[EventAudit] ${name}: ${dtoName}`);

            if (payload && typeof payload === 'object') {
                try {
                    const errors = await validate(payload);
                    if (errors.length > 0) {
                        this.logger.error(`Validation failed for event ${name} (${dtoName}): ${JSON.stringify(errors)}`);
                    } else {
                        this.logger.debug(`Payload: ${JSON.stringify(payload)}`);
                    }
                } catch (e) {
                    this.logger.warn(`Could not validate payload for ${name}: ${e.message}`);
                }
            }
        });
    }
}
