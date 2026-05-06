# Circular Dependency Resolution - Implementation Guide

## 🎯 Objective

Resolve circular dependencies in the Stellar Earn backend by implementing event-driven architecture to decouple modules.

## 📋 Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Implementation Details](#implementation-details)
4. [Files Changed](#files-changed)
5. [How to Verify](#how-to-verify)
6. [Architecture Improvements](#architecture-improvements)
7. [Future Enhancements](#future-enhancements)

## 🔴 Problem Statement

### Circular Dependency Detected

**UsersModule ↔ JobsModule** had a circular dependency:

```
UsersModule
    ├── imports JobsModule (to use JobsService)
    └── exports DataExport entity
         ↑
         └── imported by JobsModule (in DataExportProcessor)
```

This created a circular dependency that could cause:
- Module initialization failures
- Dependency injection errors
- Unpredictable behavior
- Difficult debugging

## ✅ Solution Overview

### Event-Driven Architecture

Replace direct module imports with event-based communication:

```
UsersModule                    JobsModule
    ↓                              ↑
DataExportService          DataExportListener
    ↓                              ↑
EventEmitter.emit() ──────→ @OnEvent()
    ↓                              ↓
'user.data-export.requested'  JobsService.addJob()
```

### Key Benefits

1. **No Circular Dependencies** - Modules don't import each other
2. **Loose Coupling** - Modules communicate via events
3. **Scalability** - Easy to add new listeners
4. **Testability** - Can mock event emitters
5. **Maintainability** - Clear separation of concerns

## 🔧 Implementation Details

### Step 1: Create Event DTOs

Created three new event DTOs for data export flow:

#### 1. DataExportRequestedEvent
```typescript
// src/events/dto/data-export-requested.event.ts
export class DataExportRequestedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly exportType: string,
    public readonly format: string,
  ) {
    super();
  }
}
```

**Purpose:** Emitted when user requests a data export

#### 2. DataExportCompletedEvent
```typescript
// src/events/dto/data-export-completed.event.ts
export class DataExportCompletedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly downloadUrl: string,
    public readonly fileName: string,
    public readonly recordCount: number,
  ) {
    super();
  }
}
```

**Purpose:** Emitted when data export completes successfully

#### 3. DataExportFailedEvent
```typescript
// src/events/dto/data-export-failed.event.ts
export class DataExportFailedEvent extends BaseEvent {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
    public readonly error: string,
  ) {
    super();
  }
}
```

**Purpose:** Emitted when data export fails

### Step 2: Create Event Listener

Created a listener in JobsModule to handle export requests:

```typescript
// src/modules/jobs/listeners/data-export.listener.ts
@Injectable()
export class DataExportListener {
  constructor(private readonly jobsService: JobsService) {}

  @OnEvent('user.data-export.requested', { async: true })
  async handleDataExportRequested(event: DataExportRequestedEvent) {
    await this.jobsService.addJob(QUEUES.EXPORTS, {
      organizationId: null,
      exportType: event.exportType,
      format: event.format,
      userId: event.userId,
      exportId: event.exportId,
    });
  }
}
```

**Purpose:** Listens for export requests and queues jobs

### Step 3: Update DataExportService

Modified to emit events instead of calling JobsService directly:

```typescript
// Before
constructor(
  private readonly dataExportRepo: Repository<DataExport>,
  private readonly jobsService: JobsService, // ❌ Direct dependency
) {}

async requestExport(...) {
  await this.jobsService.addJob(...); // ❌ Direct call
}

// After
constructor(
  private readonly dataExportRepo: Repository<DataExport>,
  private readonly eventEmitter: EventEmitter2, // ✅ Event emitter
) {}

async requestExport(...) {
  this.eventEmitter.emit(
    'user.data-export.requested',
    new DataExportRequestedEvent(...) // ✅ Event emission
  );
}
```

### Step 4: Update Module Imports

Removed circular dependency:

```typescript
// UsersModule - Before
@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    CacheModule,
    JobsModule, // ❌ Circular dependency
  ],
  ...
})

// UsersModule - After
@Module({
  imports: [
    TypeOrmModule.forFeature([...]),
    CacheModule, // ✅ No JobsModule import
  ],
  ...
})
```

```typescript
// JobsModule - After
@Module({
  imports: [
    TypeOrmModule.forFeature([..., DataExport]), // ✅ Only entity import
  ],
  providers: [
    ...,
    DataExportListener, // ✅ New listener
  ],
  ...
})
```

### Step 5: Update DataExportProcessor

Added event emissions for completion and failure:

```typescript
// On success
this.eventEmitter.emit(
  'user.data-export.completed',
  new DataExportCompletedEvent(...)
);

// On failure
this.eventEmitter.emit(
  'user.data-export.failed',
  new DataExportFailedEvent(...)
);
```

### Step 6: Register Event Handlers

Updated EventsModule to register all handlers:

```typescript
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({...}),
    TypeOrmModule.forFeature([EventStore]),
  ],
  providers: [
    EventsService,
    EventStoreService,
    // Event Handlers
    QuestEventsHandler,
    SubmissionEventsHandler,
    UserEventsHandler,
    DeadLetterHandler,
    // Event Listeners
    EventAuditListener,
    EventPersistenceListener,
    UserListener,
    QuestListener,
    SubmissionListener,
    PayoutListener,
  ],
  exports: [EventsService, EventStoreService],
})
export class EventsModule {}
```

## 📁 Files Changed

### New Files (5)

| File | Purpose |
|------|---------|
| `src/events/dto/data-export-requested.event.ts` | Event DTO for export requests |
| `src/events/dto/data-export-completed.event.ts` | Event DTO for export completion |
| `src/events/dto/data-export-failed.event.ts` | Event DTO for export failures |
| `src/modules/jobs/listeners/data-export.listener.ts` | Listener for export requests |
| `scripts/check-circular-deps.ts` | Script to verify no circular deps |

### Modified Files (5)

| File | Changes |
|------|---------|
| `src/modules/users/data-export.service.ts` | Use EventEmitter2 instead of JobsService |
| `src/modules/users/users.module.ts` | Removed JobsModule import |
| `src/modules/jobs/jobs.module.ts` | Added DataExportListener |
| `src/modules/jobs/processors/export.processor.ts` | Emit completion/failure events |
| `src/events/events.module.ts` | Registered all event handlers |

### Documentation Files (3)

| File | Purpose |
|------|---------|
| `CIRCULAR_DEPENDENCY_RESOLUTION.md` | Detailed documentation |
| `CIRCULAR_DEPS_SUMMARY.md` | Quick reference summary |
| `VERIFICATION_STEPS.md` | Step-by-step verification guide |

## ✅ How to Verify

### Quick Verification

```bash
# 1. Build the project
npm run build

# 2. Check for circular dependencies
npx ts-node scripts/check-circular-deps.ts

# 3. Start the application
npm run start:dev
```

### Detailed Verification

See [VERIFICATION_STEPS.md](./VERIFICATION_STEPS.md) for comprehensive testing instructions.

### Expected Results

✅ Build completes without errors  
✅ No "Circular dependency" warnings  
✅ All modules load successfully  
✅ Application starts without errors  
✅ Data export flow works via events  

## 🏗️ Architecture Improvements

### Before: Tight Coupling

```
┌─────────────┐
│ UsersModule │
│             │
│  ┌──────────┴──────┐
│  │ DataExportService│
│  │                  │
│  │  jobsService.   │
│  │  addJob()       │
│  └──────────┬──────┘
│             │
└─────────────┘
      │
      ↓ (imports)
┌─────────────┐
│ JobsModule  │
│             │
│  ┌──────────┴──────┐
│  │DataExportProcessor│
│  │                  │
│  │  uses DataExport │
│  │  entity          │
│  └──────────┬──────┘
│             │
└─────────────┘
      │
      ↑ (imports entity)
   CIRCULAR!
```

### After: Loose Coupling

```
┌─────────────┐
│ UsersModule │
│             │
│  ┌──────────┴──────┐
│  │ DataExportService│
│  │                  │
│  │  eventEmitter.  │
│  │  emit()         │
│  └──────────┬──────┘
│             │
└─────────────┘
      │
      ↓ (emits event)
┌─────────────────────┐
│   EventsModule      │
│   (Global)          │
└─────────────────────┘
      │
      ↓ (delivers event)
┌─────────────┐
│ JobsModule  │
│             │
│  ┌──────────┴──────┐
│  │DataExportListener│
│  │                  │
│  │  @OnEvent()     │
│  │  jobsService.   │
│  │  addJob()       │
│  └──────────┬──────┘
│             │
└─────────────┘
   NO CIRCULAR!
```

## 🚀 Future Enhancements

### 1. Email Notifications

Add listener for export completion:

```typescript
@Injectable()
export class ExportNotificationListener {
  @OnEvent('user.data-export.completed')
  async handleExportCompleted(event: DataExportCompletedEvent) {
    await this.emailService.sendExportReadyEmail(
      event.userId,
      event.downloadUrl
    );
  }
}
```

### 2. Webhook Notifications

Add webhook support for export events:

```typescript
@Injectable()
export class ExportWebhookListener {
  @OnEvent('user.data-export.completed')
  async handleExportCompleted(event: DataExportCompletedEvent) {
    await this.webhookService.sendWebhook(
      'data-export.completed',
      event
    );
  }
}
```

### 3. Event Replay

Implement event replay for failed exports:

```typescript
async replayFailedExports() {
  const failedEvents = await this.eventStoreService.getFailedEvents();
  for (const event of failedEvents) {
    await this.eventEmitter.emitAsync(event.eventName, event.payload);
  }
}
```

### 4. Event Metrics

Add monitoring for event processing:

```typescript
@Injectable()
export class EventMetricsListener {
  @OnEvent('**')
  async trackEvent(event: any) {
    await this.metricsService.incrementCounter('events.processed', {
      eventName: event.constructor.name
    });
  }
}
```

### 5. Event Versioning

Support multiple event versions:

```typescript
@OnEvent('user.data-export.requested.v2')
async handleExportRequestedV2(event: DataExportRequestedEventV2) {
  // Handle new version with additional fields
}
```

## 📚 Additional Resources

- [NestJS Event Emitter Documentation](https://docs.nestjs.com/techniques/events)
- [Event-Driven Architecture Patterns](https://martinfowler.com/articles/201701-event-driven.html)
- [Circular Dependency Resolution in NestJS](https://docs.nestjs.com/fundamentals/circular-dependency)

## 🤝 Contributing

When adding new features that might create circular dependencies:

1. **Check for existing events** - Use existing events if possible
2. **Create new events** - If needed, follow the event DTO pattern
3. **Use event emitters** - Prefer events over direct service calls
4. **Document events** - Add event documentation to this file
5. **Test event flow** - Verify events are emitted and received
6. **Run verification** - Use `check-circular-deps.ts` script

## 📝 Notes

- EventsModule is marked as `@Global()` - available everywhere
- Event names use dot notation: `module.entity.action`
- Events are async by default: `{ async: true }`
- Event emitters are injected via DI
- Event listeners are automatically registered

## ✨ Summary

This implementation successfully resolves circular dependencies by:

1. ✅ Removing direct module imports
2. ✅ Implementing event-driven communication
3. ✅ Maintaining all existing functionality
4. ✅ Improving code maintainability
5. ✅ Enabling future extensibility

**Result:** Clean, maintainable, and scalable architecture with no circular dependencies.

---

**For questions or issues, please refer to:**
- [CIRCULAR_DEPENDENCY_RESOLUTION.md](./CIRCULAR_DEPENDENCY_RESOLUTION.md) - Detailed documentation
- [CIRCULAR_DEPS_SUMMARY.md](./CIRCULAR_DEPS_SUMMARY.md) - Quick reference
- [VERIFICATION_STEPS.md](./VERIFICATION_STEPS.md) - Testing guide
