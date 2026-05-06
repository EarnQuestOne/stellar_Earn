# Architecture Diagram - Circular Dependency Resolution

## Before: Circular Dependency ❌

```
┌─────────────────────────────────────────────────────────────┐
│                        AppModule                             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│      UsersModule          │   │      JobsModule           │
│                           │   │                           │
│  ┌─────────────────────┐  │   │  ┌─────────────────────┐  │
│  │ DataExportService   │  │   │  │ DataExportProcessor │  │
│  │                     │  │   │  │                     │  │
│  │ - jobsService ──────┼──┼───┼─>│ - dataExportRepo    │  │
│  │   .addJob()         │  │   │  │                     │  │
│  └─────────────────────┘  │   │  └─────────────────────┘  │
│                           │   │                           │
│  exports:                 │   │  imports:                 │
│  - DataExport entity ─────┼───┼─>- DataExport entity     │
│                           │   │                           │
└───────────────────────────┘   └───────────────────────────┘
         │                                   │
         │                                   │
         └───────────────┬───────────────────┘
                         │
                    CIRCULAR! ❌
```

## After: Event-Driven Architecture ✅

```
┌─────────────────────────────────────────────────────────────┐
│                        AppModule                             │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
┌───────────────────┐  ┌──────────────┐  ┌───────────────────┐
│   UsersModule     │  │EventsModule  │  │   JobsModule      │
│                   │  │  (@Global)   │  │                   │
│ ┌───────────────┐ │  │              │  │ ┌───────────────┐ │
│ │DataExportSvc  │ │  │ ┌──────────┐ │  │ │DataExportList │ │
│ │               │ │  │ │EventEmit │ │  │ │               │ │
│ │eventEmitter   │ │  │ │ter2      │ │  │ │jobsService    │ │
│ │.emit() ───────┼─┼──┼>│          │ │  │ │.addJob()      │ │
│ │               │ │  │ │          │ │  │ │               │ │
│ └───────────────┘ │  │ └────┬─────┘ │  │ └───────────────┘ │
│                   │  │      │       │  │         ▲         │
│                   │  │      │       │  │         │         │
│                   │  │      └───────┼──┼─────────┘         │
│                   │  │              │  │                   │
│                   │  │ ┌──────────┐ │  │ ┌───────────────┐ │
│                   │  │ │Event     │ │  │ │DataExportProc │ │
│                   │  │ │Handlers  │ │  │ │               │ │
│                   │  │ │          │ │  │ │eventEmitter   │ │
│                   │  │ │          │<┼──┼─┤.emit()        │ │
│                   │  │ └──────────┘ │  │ └───────────────┘ │
│                   │  │              │  │                   │
└───────────────────┘  └──────────────┘  └───────────────────┘
                              │
                         NO CIRCULAR! ✅
```

## Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Export Event Flow                        │
└─────────────────────────────────────────────────────────────────┘

1. User Request
   │
   ▼
┌──────────────────┐
│ UsersController  │
│ .requestExport() │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ DataExportService        │
│ .requestExport()         │
│                          │
│ 1. Create DB record      │
│ 2. Emit event ───────────┼──┐
└──────────────────────────┘  │
                              │
         ┌────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ EventEmitter2                        │
│ emit('user.data-export.requested')   │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│ DataExportListener                   │
│ @OnEvent('user.data-export.requested')│
│                                      │
│ 1. Receive event                     │
│ 2. Call JobsService.addJob() ────────┼──┐
└──────────────────────────────────────┘  │
                                          │
         ┌────────────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ JobsService              │
│ .addJob(QUEUES.EXPORTS)  │
│                          │
│ Queue job in BullMQ      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ DataExportProcessor      │
│ .processExport()         │
│                          │
│ 1. Process export        │
│ 2. Update DB             │
│ 3. Emit completion ──────┼──┐
└──────────────────────────┘  │
                              │
         ┌────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ EventEmitter2                        │
│ emit('user.data-export.completed')   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Future Listeners                     │
│ - Email notification                 │
│ - Webhook notification               │
│ - Analytics tracking                 │
└──────────────────────────────────────┘
```

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                        AppModule                             │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ EventsModule │      │ UsersModule  │      │ JobsModule   │
│  (@Global)   │      │              │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │                     │
        │                     ▼                     ▼
        │             ┌──────────────┐      ┌──────────────┐
        │             │ CacheModule  │      │              │
        │             └──────────────┘      │              │
        │                                   │              │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ AuthModule   │      │ QuestsModule │      │EmailModule   │
│      │       │      │      │       │      │      │       │
│      ▼       │      │      ▼       │      │      ▼       │
│ UsersModule  │      │ModerationMod │      │ JobsModule   │
└──────────────┘      └──────────────┘      └──────────────┘
                              │
                              ▼
                      ┌──────────────┐
                      │Submissions   │
                      │Module        │
                      │      │       │
                      │      ▼       │
                      │Notifications │
                      │Module        │
                      └──────────────┘

Legend:
─────> One-way dependency (OK)
═════> Would be circular (FIXED)
```

## Event Communication Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Communication                       │
└─────────────────────────────────────────────────────────────┘

Module A                EventsModule              Module B
(Emitter)               (Global Bus)              (Listener)

┌──────────┐            ┌──────────┐            ┌──────────┐
│          │            │          │            │          │
│ Service  │            │EventEmit │            │ Listener │
│          │            │ter2      │            │          │
│          │            │          │            │          │
│ emit()───┼───────────>│          │───────────>│@OnEvent()│
│          │            │          │            │          │
│          │            │ Routing  │            │ handle() │
│          │            │          │            │          │
└──────────┘            └──────────┘            └──────────┘

Benefits:
✅ No direct dependency between Module A and Module B
✅ Loose coupling
✅ Easy to add new listeners
✅ Testable in isolation
```

## Data Flow Comparison

### Before (Direct Call)

```
UsersModule                          JobsModule
    │                                    │
    ▼                                    ▼
DataExportService ──────────────> JobsService
    │                                    │
    │ jobsService.addJob()               │
    └────────────────────────────────────┤
                                         ▼
                                    addJob()
                                         │
                                         ▼
                                    Queue Job

Problem: Direct dependency creates tight coupling
```

### After (Event-Driven)

```
UsersModule          EventsModule          JobsModule
    │                     │                     │
    ▼                     ▼                     ▼
DataExportService    EventEmitter2      DataExportListener
    │                     │                     │
    │ emit()              │                     │
    └────────────────────>│                     │
                          │ route event         │
                          └────────────────────>│
                                                │ @OnEvent()
                                                ▼
                                           JobsService
                                                │
                                                ▼
                                           Queue Job

Solution: Event-driven communication eliminates coupling
```

## Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                  Component Interaction                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST /api/users/me/export
       ▼
┌─────────────────────┐
│  UsersController    │
│  @Post('me/export') │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐
│  DataExportService          │
│  - Create export record     │
│  - Emit event               │
└──────┬──────────────────────┘
       │
       │ Event: user.data-export.requested
       ▼
┌─────────────────────────────┐
│  EventEmitter2 (Global)     │
│  - Route to listeners       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  DataExportListener         │
│  - Receive event            │
│  - Queue job                │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  JobsService                │
│  - Add to BullMQ queue      │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  BullMQ Worker              │
│  - Pick up job              │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  DataExportProcessor        │
│  - Process export           │
│  - Emit completion event    │
└──────┬──────────────────────┘
       │
       │ Event: user.data-export.completed
       ▼
┌─────────────────────────────┐
│  EventEmitter2 (Global)     │
│  - Route to listeners       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│  Future Listeners           │
│  - Email notification       │
│  - Webhook notification     │
│  - Analytics tracking       │
└─────────────────────────────┘
```

## Summary

### Key Architectural Changes

1. **Removed Direct Dependency**
   - UsersModule no longer imports JobsModule
   - Communication via events instead

2. **Introduced Event Bus**
   - EventsModule acts as global event bus
   - All modules can emit and listen to events

3. **Decoupled Modules**
   - Modules don't know about each other
   - Only know about event contracts

4. **Improved Scalability**
   - Easy to add new event listeners
   - No need to modify existing code

### Benefits

✅ **No Circular Dependencies** - Clean module graph  
✅ **Loose Coupling** - Modules are independent  
✅ **High Cohesion** - Each module has single responsibility  
✅ **Testability** - Can test modules in isolation  
✅ **Maintainability** - Easy to understand and modify  
✅ **Extensibility** - Easy to add new features  

---

**For more details, see:**
- `CIRCULAR_DEPENDENCY_RESOLUTION.md` - Technical documentation
- `CIRCULAR_DEPS_SUMMARY.md` - Quick reference
- `IMPLEMENTATION_COMPLETE.md` - Completion summary
