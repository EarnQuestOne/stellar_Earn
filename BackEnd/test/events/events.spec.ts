import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { UserCreatedEvent } from '../../src/events/dto/user-created.event';
import { UserUpdatedEvent } from '../../src/events/dto/user-updated.event';
import { UserListener } from '../../src/events/listeners/user.listener';
import { QuestCreatedEvent } from '../../src/events/dto/quest-created.event';
import { QuestDeletedEvent } from '../../src/events/dto/quest-deleted.event';
import { QuestListener } from '../../src/events/listeners/quest.listener';
import { PayoutProcessedEvent } from '../../src/events/dto/payout-processed.event';
import { PayoutFailedEvent } from '../../src/events/dto/payout-failed.event';
import { SubmissionRejectedEvent } from '../../src/events/dto/submission-rejected.event';
import { EventAuditListener } from '../../src/events/listeners/event-audit.listener';

import { PayoutListener } from '../../src/events/listeners/payout.listener';
import { SubmissionListener } from '../../src/events/listeners/submission.listener';

describe('Events Architecture', () => {
    let eventEmitter: EventEmitter2;
    let userListener: UserListener;
    let questListener: QuestListener;
    let payoutListener: PayoutListener;
    let submissionListener: SubmissionListener;
    let auditListener: EventAuditListener;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            imports: [
                EventEmitterModule.forRoot({
                    wildcard: true,
                    delimiter: '.',
                }),
            ],
            providers: [
                UserListener,
                QuestListener,
                PayoutListener,
                SubmissionListener,
                EventAuditListener,
            ],
        }).compile();

        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
        userListener = module.get<UserListener>(UserListener);
        questListener = module.get<QuestListener>(QuestListener);
        payoutListener = module.get<PayoutListener>(PayoutListener);
        submissionListener = module.get<SubmissionListener>(SubmissionListener);
        auditListener = module.get<EventAuditListener>(EventAuditListener);

        await module.init();
    });

    it('should have listeners registered', () => {
        expect(eventEmitter.listeners('user.created').length).toBeGreaterThan(0);
        expect(eventEmitter.listeners('quest.created').length).toBeGreaterThan(0);
        expect(eventEmitter.listeners('payout.processed').length).toBeGreaterThan(0);
        expect(eventEmitter.listeners('submission.rejected').length).toBeGreaterThan(0);
    });

    it('should handle UserCreatedEvent', async () => {
        const spy = jest.spyOn(userListener, 'handleUserCreatedEvent');
        const event = new UserCreatedEvent('user-1', 'testuser', 'test@example.com', 'GC...');

        await eventEmitter.emitAsync('user.created', event);

        // Wait for @Retry and async listener
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalled();
    });

    it('should handle QuestCreatedEvent', async () => {
        const spy = jest.spyOn(questListener, 'handleQuestCreatedEvent');
        const event = new QuestCreatedEvent('quest-1', 'Test Quest', 'G...', '100');

        await eventEmitter.emitAsync('quest.created', event);

        // Wait for async listener
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalled();
    });

    it('should audit log all events', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new UserCreatedEvent('user-1', 'testuser', 'test@example.com', 'GC...');

        await eventEmitter.emitAsync('user.created', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] user.created: UserCreatedEvent'),
        );
    });

    it('should maintain audit log for QuestDeletedEvent', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new QuestDeletedEvent('quest_1', 'G...');

        await eventEmitter.emitAsync('quest.deleted', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] quest.deleted: QuestDeletedEvent'),
        );
    });

    it('should maintain audit log for UserUpdatedEvent', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new UserUpdatedEvent('user_1', ['username', 'email']);

        await eventEmitter.emitAsync('user.updated', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] user.updated: UserUpdatedEvent'),
        );
    });

    it('should maintain audit log for PayoutProcessedEvent', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new PayoutProcessedEvent(
            'payout_1',
            'G...',
            '100',
            'hash',
        );

        await eventEmitter.emitAsync('payout.processed', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] payout.processed: PayoutProcessedEvent'),
        );
    });

    it('should maintain audit log for PayoutFailedEvent', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new PayoutFailedEvent(
            'payout_1',
            'G...',
            'Error message',
        );

        await eventEmitter.emitAsync('payout.failed', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] payout.failed: PayoutFailedEvent'),
        );
    });

    it('should maintain audit log for SubmissionRejectedEvent', async () => {
        const spy = jest.spyOn(auditListener['logger'], 'log');
        const event = new SubmissionRejectedEvent(
            'sub_1',
            'user_1',
            'Rejected reason',
        );

        await eventEmitter.emitAsync('submission.rejected', event);

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('[EventAudit] submission.rejected: SubmissionRejectedEvent'),
        );
    });
});
