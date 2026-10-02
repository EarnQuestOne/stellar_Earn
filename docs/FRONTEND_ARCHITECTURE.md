# Canonical Frontend Architecture Documentation

## Overview

This document provides a comprehensive mapping of the Stellar Earn frontend architecture, detailing the relationship between application layers and data layers. It serves as the canonical reference for understanding how the frontend is structured, how data flows through the application, and how different layers interact.

## Architecture Principles

1. **Separation of Concerns**: Clear separation between UI, business logic, and data access
2. **Type Safety**: Strong TypeScript typing throughout the stack
3. **State Management**: Centralized state using Zustand with domain-based slices
4. **API Layer**: Typed API clients with error handling and token management
5. **Component Organization**: Domain-driven component structure
6. **Performance Optimization**: Code splitting, lazy loading, and caching strategies

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Presentation Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Pages      │  │  Components  │  │   Layouts    │          │
│  │  (app/)      │  │ (components/)│  │  (layouts/)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Application Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Context    │  │    Hooks     │  │   Services   │          │
│  │ (context/)   │  │  (lib/hooks) │  │ (lib/services)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         State Management Layer                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Zustand    │  │    Slices    │  │ Middleware   │          │
│  │ (lib/store/) │  │ (store/slices)│ │ (store/middleware)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Data Access Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ API Clients  │  │   Types      │  │  Validation   │          │
│  │  (lib/api/)  │  │ (lib/types/) │  │ (lib/validation)│       │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         External Services                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Backend    │  │   Stellar    │  │  Analytics   │          │
│  │     API      │  │   Network    │  │  Services    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Layer-by-Layer Breakdown

### 1. Presentation Layer (UI)

**Location**: `FrontEnd/my-app/app/`, `FrontEnd/my-app/components/`

#### App Router Structure (`app/`)

```
app/
├── layout.tsx          # Root layout with providers
├── page.tsx            # Homepage
├── error.tsx           # Global error boundary
├── not-found.tsx       # 404 page
├── admin/              # Admin dashboard pages
├── dashboard/          # User dashboard pages
├── profile/            # User profile pages
├── quests/             # Quest browsing and management
├── rewards/            # Rewards and payouts
├── settings/           # User settings
├── submissions/        # Submission management
└── providers/          # Provider components
```

#### Component Organization (`components/`)

```
components/
├── a11y/               # Accessibility components
├── admin/              # Admin-specific components
├── analytics/          # Analytics visualization
├── auth/               # Authentication UI
├── dashboard/          # Dashboard components
├── error/              # Error handling UI
├── homepage/           # Homepage components
├── layout/             # Layout components
├── notifications/      # Notification display
├── onboarding/         # Onboarding flow
├── profile/            # Profile components
├── providers/          # Context providers
├── quest/              # Quest-related components
├── reputation/         # Reputation display
├── rewards/            # Rewards display
├── search/             # Search components
├── submission/         # Submission components
├── ui/                 # Reusable UI primitives
└── wallet/             # Wallet connection UI
```

**Responsibilities**:

- Render UI based on state and props
- Handle user interactions and events
- Present data in user-friendly formats
- Implement responsive design and accessibility

### 2. Application Layer (Business Logic)

**Location**: `FrontEnd/my-app/context/`, `FrontEnd/my-app/lib/hooks/`

#### Context Layer (`context/`)

```typescript
context/
├── AuthContext.tsx     # Authentication state and methods
├── WalletContext.tsx   # Wallet connection and management
└── walletTypes.ts      # Wallet-related type definitions
```

**Responsibilities**:

- Provide global application state
- Expose business logic methods
- Handle cross-component state sharing
- Manage authentication and wallet connections

#### Custom Hooks (`lib/hooks/`)

**Common Pattern**: Domain-specific hooks that encapsulate business logic

```typescript
// Example hook pattern
export function useQuests() {
  const quests = useStore(selectQuests);
  const filters = useStore(selectQuestFilters);
  const isLoading = useStore((s) => s.isLoading);

  const fetchQuests = useCallback(async () => {
    // Business logic for fetching quests
  }, []);

  return { quests, filters, isLoading, fetchQuests };
}
```

**Responsibilities**:

- Encapsulate reusable business logic
- Connect components to state management
- Handle side effects and data fetching
- Provide computed values and transformations

### 3. State Management Layer

**Location**: `FrontEnd/my-app/lib/store/`

#### Store Structure

```typescript
store/
├── index.ts            # Main store composition
├── slices/             # Domain-based state slices
│   ├── userSlice.ts
│   ├── questSlice.ts
│   ├── submissionSlice.ts
│   ├── notificationSlice.ts
│   ├── walletSlice.ts
│   └── uiSlice.ts
└── middlewear/
    └── persistence.ts  # Local storage persistence
```

#### State Slices Architecture

**User Slice** (`userSlice.ts`)

```typescript
interface UserSlice {
  // State
  profile: UserProfile | null;
  stats: ProfileStats | null;
  achievements: Achievement[];
  activities: Activity[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserData: (data: UserData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}
```

**Quest Slice** (`questSlice.ts`)

```typescript
interface QuestSlice {
  // State
  quests: Quest[];
  filters: QuestFilters;
  selectedQuest: Quest | null;
  isLoading: boolean;

  // Actions
  setQuests: (quests: Quest[]) => void;
  setFilters: (filters: QuestFilters) => void;
  setSelectedQuest: (quest: Quest | null) => void;
}
```

**Submission Slice** (`submissionSlice.ts`)

```typescript
interface SubmissionSlice {
  // State
  submissions: Submission[];
  selectedSubmission: Submission | null;
  isLoading: boolean;

  // Actions
  setSubmissions: (submissions: Submission[]) => void;
  addSubmission: (submission: Submission) => void;
  updateSubmission: (id: string, updates: Partial<Submission>) => void;
}
```

**Notification Slice** (`notificationSlice.ts`)

```typescript
interface NotificationSlice {
  // State
  notifications: Notification[];
  unreadCount: number;
  notificationSettings: NotificationSettings;

  // Actions
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  clearNotifications: () => void;
}
```

**Wallet Slice** (`walletSlice.ts`)

```typescript
interface WalletSlice {
  // State
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  selectedWalletId: string | null;

  // Actions
  setAddress: (address: string | null) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
}
```

**UI Slice** (`uiSlice.ts`)

```typescript
interface UISlice {
  // State
  theme: "light" | "dark";
  modal: ModalState | null;
  sidebarOpen: boolean;

  // Actions
  setTheme: (theme: "light" | "dark") => void;
  setModal: (modal: ModalState | null) => void;
  toggleSidebar: () => void;
}
```

**Responsibilities**:

- Centralize application state
- Provide type-safe state access
- Handle state updates through actions
- Persist critical state to localStorage
- Enable time-travel debugging with Redux DevTools

### 4. Data Access Layer

**Location**: `FrontEnd/my-app/lib/api/`, `FrontEnd/my-app/lib/types/`

#### API Client Structure

```typescript
api/
├── client.ts           # Axios instance with interceptors
├── auth.ts             # Authentication endpoints
├── quests.ts           # Quest-related endpoints
├── submissions.ts      # Submission endpoints
├── user.ts             # User profile endpoints
├── notifications.ts    # Notification endpoints
├── payouts.ts          # Payout endpoints
├── admin.ts            # Admin endpoints
├── profile.ts          # Profile management
├── search.ts           # Search functionality
├── api-error-mapper.ts # Error mapping utilities
├── domain-errors.ts    # Domain-specific error types
└── lazy-client.ts      # Lazy-loaded API client
```

#### API Client Architecture

**Base Client** (`client.ts`)

```typescript
// Features:
- Axios-based HTTP client
- JWT token management with automatic refresh
- Request/response interceptors
- Error handling and transformation
- Offline detection
- Retry logic with exponential backoff
- Request cancellation support
```

**Domain API Modules**
Each domain has its own API module following this pattern:

```typescript
// Example: quests.ts
export const questApi = {
  getQuests: (params: QuestQueryParams) =>
    apiClient.get<QuestResponse[]>("/quests", { params }),

  getQuestById: (id: string) => apiClient.get<QuestResponse>(`/quests/${id}`),

  createQuest: (data: CreateQuestRequest) =>
    apiClient.post<QuestResponse>("/quests", data),

  updateQuest: (id: string, data: UpdateQuestRequest) =>
    apiClient.put<QuestResponse>(`/quests/${id}`, data),

  deleteQuest: (id: string) => apiClient.delete<void>(`/quests/${id}`),
};
```

#### Type Definitions (`lib/types/`)

```typescript
types/
├── api.types.ts        # API request/response types
├── profile.ts          # Profile-related types
├── quest.ts            # Quest-related types
├── submission.ts       # Submission types
├── reputation.ts       # Reputation system types
├── dashboard.ts        # Dashboard types
├── admin.ts            # Admin-specific types
└── index.ts            # Type exports
```

**Key Type Categories**:

- **API Types**: Request/response shapes, pagination, error formats
- **Domain Types**: Business entities (Quest, User, Submission, etc.)
- **UI Types**: Component props, state shapes, event handlers
- **Configuration Types**: Settings, preferences, feature flags

**Responsibilities**:

- Provide type-safe API communication
- Handle data serialization/deserialization
- Manage authentication and authorization
- Implement error handling and retry logic
- Ensure data consistency and validation

### 5. Supporting Infrastructure

**Location**: `FrontEnd/my-app/lib/utils/`, `FrontEnd/my-app/lib/config/`

#### Utility Functions (`lib/utils/`)

```
utils/
├── error-handler.ts    # Error handling utilities
├── formatters.ts       # Data formatting functions
├── validators.ts       # Validation utilities
├── constants.ts        # Application constants
└── helpers.ts          # Helper functions
```

#### Configuration (`lib/config/`)

```
config/
├── env.ts              # Environment variables
├── features.ts         # Feature flags
└── constants.ts        # Configuration constants
```

#### Validation (`lib/validation/`)

```
validation/
├── schemas/            # Zod validation schemas
├── validators.ts       # Custom validators
└── rules.ts            # Validation rules
```

#### Stellar Integration (`lib/stellar/`)

```
stellar/
├── client.ts           # Stellar SDK client
├── transactions.ts     # Transaction utilities
├── wallet.ts           # Wallet operations
└── contracts.ts        # Smart contract interactions
```

#### Analytics (`lib/analytics/`)

```
analytics/
├── tracking.ts         # Event tracking
├── metrics.ts          # Performance metrics
└── reports.ts          # Analytics reporting
```

## Data Flow Patterns

### 1. Read Data Flow (GET Operations)

```
User Action → Component → Hook/Context → Store Selector → API Client → Backend API
                                              ↓
                                         State Update
                                              ↓
                                        Component Re-render
```

**Example: Fetching Quests**

```typescript
// Component
function QuestList() {
  const { quests, isLoading, fetchQuests } = useQuests();

  useEffect(() => {
    fetchQuests();
  }, []);

  return <div>{quests.map(quest => <QuestCard key={quest.id} quest={quest} />)}</div>;
}

// Hook
function useQuests() {
  const dispatch = useStore((state) => state.dispatch);
  const quests = useStore(selectQuests);
  const isLoading = useStore((state) => state.isLoading);

  const fetchQuests = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await questApi.getQuests();
      dispatch(setQuests(response.data));
    } catch (error) {
      dispatch(setError(error.message));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  return { quests, isLoading, fetchQuests };
}
```

### 2. Write Data Flow (POST/PUT/DELETE Operations)

```
User Action → Component → Hook/Context → API Client → Backend API
                                              ↓
                                         Response Processing
                                              ↓
                                         State Update
                                              ↓
                                        Component Re-render
                                              ↓
                                         User Feedback
```

**Example: Creating a Submission**

```typescript
// Component
function SubmitQuestForm({ questId }) {
  const { createSubmission } = useSubmissions();

  const handleSubmit = async (data) => {
    await createSubmission(questId, data);
    // Show success message, redirect, etc.
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// Hook
function useSubmissions() {
  const dispatch = useStore((state) => state.dispatch);

  const createSubmission = useCallback(async (questId: string, data: CreateSubmissionRequest) => {
    try {
      const response = await submissionApi.create(questId, data);
      dispatch(addSubmission(response.data));
      dispatch(addNotification({ type: 'success', message: 'Submission created' }));
    } catch (error) {
      dispatch(addNotification({ type: 'error', message: error.message }));
    }
  }, [dispatch]);

  return { createSubmission };
}
```

### 3. Real-time Data Flow (WebSocket/WebSocket-like)

```
Server Event → WebSocket Handler → Context/Store → Component Re-render
```

**Example: Real-time Notifications**

```typescript
// Context
function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const ws = new WebSocket(NOTIFICATION_WS_URL);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      setNotifications(prev => [notification, ...prev]);
    };

    return () => ws.close();
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications }}>
      {children}
    </NotificationContext.Provider>
  );
}
```

### 4. Optimistic Updates Pattern

```typescript
async function optimisticUpdate(action: () => Promise<void>) {
  // 1. Update state immediately
  dispatch(setOptimisticState());

  try {
    // 2. Execute API call
    await action();
    // 3. Update with server response
    dispatch(setServerState());
  } catch (error) {
    // 4. Rollback on error
    dispatch(rollbackState());
  }
}
```

## Domain Mapping

### User Domain

**Components**: `components/profile/`, `components/auth/`
**Store**: `userSlice.ts`
**API**: `user.ts`, `auth.ts`, `profile.ts`
**Types**: `profile.ts`, `api.types.ts` (User types)

**Data Flow**:

1. User authenticates via Wallet Context
2. Auth tokens stored and managed
3. User profile fetched via API
4. Profile data stored in User Slice
5. Components consume via selectors

### Quest Domain

**Components**: `components/quest/`, `app/quests/`
**Store**: `questSlice.ts`
**API**: `quests.ts`
**Types**: `quest.ts`, `api.types.ts` (Quest types)

**Data Flow**:

1. Quests fetched via API with filters
2. Data stored in Quest Slice
3. Components display via quest cards
4. User interactions update filters
5. Refetch with new filters

### Submission Domain

**Components**: `components/submission/`, `app/submissions/`
**Store**: `submissionSlice.ts`
**API**: `submissions.ts`
**Types**: `submission.ts`, `api.types.ts` (Submission types)

**Data Flow**:

1. User creates submission via form
2. Data validated and sent to API
3. Optimistic update to store
4. Server response confirms/rejects
5. Store updated with final state

### Notification Domain

**Components**: `components/notifications/`
**Store**: `notificationSlice.ts`
**API**: `notifications.ts`
**Types**: `api.types.ts` (Notification types)

**Data Flow**:

1. WebSocket/Real-time events
2. Notifications added to store
3. Components display unread count
4. User marks as read
5. Sync with server

### Payout Domain

**Components**: `components/rewards/`, `app/rewards/`
**Store**: (integrated with user/quest slices)
**API**: `payouts.ts`
**Types**: `api.types.ts` (Payout types)

**Data Flow**:

1. Submission approved triggers payout
2. Payout processed via Stellar
3. Transaction status tracked
4. User notified of completion
5. History stored in profile

## Security Architecture

### Authentication Flow

```
1. User connects wallet
2. Backend generates challenge
3. User signs challenge
4. Signature sent to backend
5. Backend verifies signature
6. JWT tokens issued
7. Tokens stored in secure storage
8. Tokens attached to API requests
9. Automatic token refresh
```

### Token Management

```typescript
// Token storage strategy
- Access token: Short-lived (15 minutes)
- Refresh token: Long-lived (7 days)
- Storage: HttpOnly cookies (recommended) or localStorage with encryption
- Refresh: Automatic on 401 responses
- Cleanup: On logout and token expiry
```

### Data Protection

- **API Communication**: HTTPS only, certificate pinning
- **Sensitive Data**: Encryption at rest and in transit
- **Input Validation**: Client-side and server-side validation
- **XSS Prevention**: Content Security Policy, input sanitization
- **CSRF Protection**: Token-based CSRF protection

## Performance Optimization

### Code Splitting

```typescript
// Route-based splitting
const Dashboard = lazy(() => import("./app/dashboard/page"));
const AdminPanel = lazy(() => import("./app/admin/page"));

// Component-based splitting
const HeavyComponent = lazy(() => import("./components/HeavyComponent"));
```

### State Persistence

```typescript
// Selective state persistence
persist(
  (state) => ({
    theme: state.theme,
    address: state.address,
    notifications: state.notifications,
  }),
  {
    name: "stellar-earn-store",
    storage: createJSONStorage(() => localStorage),
  },
);
```

### Caching Strategy

- **API Caching**: Response caching with TTL
- **State Caching**: Store persistence and selective updates
- **Image Caching**: Optimized image loading with next/image
- **Route Caching**: Static page generation where possible

## Testing Architecture

### Unit Tests

- **Components**: React Component Testing
- **Hooks**: Custom hook testing
- **Utilities**: Pure function testing
- **API Clients**: Mocked API testing

### Integration Tests

- **State Management**: Store slice interactions
- **API Layer**: Client-server communication
- **Context**: Context provider behavior

### E2E Tests

- **User Flows**: Critical user journeys
- **Authentication**: Login/logout flows
- **Data Persistence**: State across sessions

## Monitoring and Observability

### Error Tracking

- **Client Errors**: Sentry integration
- **API Errors**: Error boundary and logging
- **Performance**: Performance monitoring

### Analytics

- **User Events**: Custom event tracking
- **Performance**: Core Web Vitals monitoring
- **Business Metrics**: Conversion tracking

## Migration and Evolution

### Version Strategy

- **API Versioning**: Semantic versioning for API contracts
- **State Migration**: Gradual state schema updates
- **Component Deprecation**: Progressive component replacement

### Extensibility

- **Plugin Architecture**: Feature-based module system
- **Event System**: Decoupled event handling
- **Configuration Driven**: Feature flags and configuration

## Best Practices

### Component Design

- **Single Responsibility**: Each component has one clear purpose
- **Composition over Inheritance**: Prefer component composition
- **Props Interface**: Clear prop contracts with TypeScript
- **Error Boundaries**: Graceful error handling

### State Management

- **Normalization**: Normalized data structure for lists
- **Immutability**: Immutable state updates
- **Selective Updates**: Only update what changes
- **Computed Values**: Derive data from state

### API Integration

- **Type Safety**: Strongly typed API contracts
- **Error Handling**: Comprehensive error handling
- **Retry Logic**: Automatic retry for transient failures
- **Request Cancellation**: Abort unused requests

### Code Organization

- **Domain-Driven**: Organize by business domain
- **Colocation**: Keep related code together
- **Clear Boundaries**: Well-defined layer boundaries
- **Consistent Patterns**: Follow established patterns

## Conclusion

This architecture provides a robust foundation for the Stellar Earn frontend application. The clear separation of concerns, strong typing, and well-defined data flows enable maintainability, scalability, and developer productivity.

The mapping between application and data layers ensures that developers can easily understand how data flows through the system and where to make changes when adding new features or modifying existing ones.

For questions or suggestions about this architecture, please refer to the project documentation or contact the development team.
