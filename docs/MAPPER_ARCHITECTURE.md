# Mapper Architecture Documentation

## Overview

This document describes the explicit mapper architecture implemented to consolidate API DTOs and UI domain models. The mappers provide a clean separation of concerns between data transfer objects (DTOs) and domain models, making the codebase more maintainable and testable.

## Architecture

### Backend (NestJS)

Backend mappers convert between database entities and API DTOs.

**Location:** `BackEnd/src/modules/{module}/mappers/`

**Pattern:** Static methods in mapper classes

#### Quest Mapper
- **File:** `BackEnd/src/modules/quests/mappers/quest.mapper.ts`
- **Methods:**
  - `toDto(quest: Quest): QuestResponseDto` - Convert entity to DTO
  - `toDtoArray(quests: Quest[]): QuestResponseDto[]` - Convert array of entities
  - `fromEntity(quest: Quest): QuestResponseDto` - Legacy alias for backward compatibility

#### User Mapper
- **File:** `BackEnd/src/modules/users/mappers/user.mapper.ts`
- **Methods:**
  - `toDto(user: User): UserResponseDto` - Convert entity to DTO
  - `toDtoArray(users: User[]): UserResponseDto[]` - Convert array of entities
  - `toLeaderboardDto(user: User, rank: number): LeaderboardUserDto` - Convert to leaderboard format
  - `toStatsDto(stats): UserStatsResponseDto` - Convert stats to DTO
  - `toUserQuestDto(questData): UserQuestDto` - Convert quest data to DTO

#### Submission Mapper
- **File:** `BackEnd/src/modules/submissions/mappers/submission.mapper.ts`
- **Methods:**
  - `toDto(submission: Submission): SubmissionDataDto` - Convert entity to DTO
  - `toDtoArray(submissions: Submission[]): SubmissionDataDto[]` - Convert array of entities
  - `toQuestInfoDto(quest): SubmissionQuestInfoDto` - Convert quest info
  - `toUserInfoDto(user): SubmissionUserInfoDto` - Convert user info

### Frontend (Next.js)

Frontend mappers convert between API response types and UI domain models.

**Location:** `FrontEnd/my-app/lib/mappers/`

**Pattern:** Static methods in mapper classes

#### Quest Mapper
- **File:** `FrontEnd/my-app/lib/mappers/quest.mapper.ts`
- **Methods:**
  - `toDomain(apiQuest: QuestResponse): Quest` - Convert API response to domain model
  - `toDomainArray(apiQuests: QuestResponse[]): Quest[]` - Convert array
  - `toApi(domainQuest: Quest): QuestResponse` - Convert domain model to API format
  - `toApiArray(domainQuests: Quest[]): QuestResponse[]` - Convert array

#### Profile Mapper
- **File:** `FrontEnd/my-app/lib/mappers/profile.mapper.ts`
- **Methods:**
  - `toDomain(apiUser: UserResponse, isOwnProfile?: boolean): UserProfile` - Convert API response to domain model
  - `toStatsDomain(apiStats: UserStatsResponse): ProfileStats` - Convert stats to domain model
  - `toApi(domainProfile: UserProfile): UserResponse` - Convert domain model to API format

#### Submission Mapper
- **File:** `FrontEnd/my-app/lib/mappers/submission.mapper.ts`
- **Methods:**
  - `toDomain(apiSubmission: SubmissionResponse): Submission` - Convert API response to domain model
  - `toDomainArray(apiSubmissions: SubmissionResponse[]): Submission[]` - Convert array
  - `toApi(domainSubmission: Submission): SubmissionResponse` - Convert domain model to API format
  - `toApiArray(domainSubmissions: Submission[]): SubmissionResponse[]` - Convert array

## Usage Examples

### Backend Usage

```typescript
import { QuestMapper } from './mappers/quest.mapper';

// Convert entity to DTO
const quest = await this.questRepository.findOne({ where: { id } });
const questDto = QuestMapper.toDto(quest);

// Convert array of entities
const quests = await this.questRepository.find();
const questDtos = QuestMapper.toDtoArray(quests);
```

### Frontend Usage

```typescript
import { QuestMapper } from '@/lib/mappers';

// Convert API response to domain model
const apiQuest = await fetchQuest(id);
const domainQuest = QuestMapper.toDomain(apiQuest);

// Convert array of API responses
const apiQuests = await fetchQuests();
const domainQuests = QuestMapper.toDomainArray(apiQuests);

// Convert domain model back to API format (for updates)
const apiQuest = QuestMapper.toApi(domainQuest);
```

## Benefits

1. **Separation of Concerns:** Mapping logic is isolated from business logic and API controllers
2. **Testability:** Mappers can be unit tested independently
3. **Maintainability:** Changes to DTOs or domain models only require mapper updates
4. **Type Safety:** TypeScript ensures type correctness during mapping
5. **Reusability:** Mappers can be reused across different services and components
6. **Backward Compatibility:** Legacy `fromEntity` methods maintained during transition

## Testing

All mappers include comprehensive unit tests:

- **Backend Tests:** Located in `BackEnd/src/modules/{module}/mappers/*.spec.ts`
- **Frontend Tests:** Located in `FrontEnd/my-app/lib/mappers/__tests__/*.test.ts`

Run tests with:
- Backend: `npm test` (in BackEnd directory)
- Frontend: `npm test` (in FrontEnd/my-app directory)

## Migration Guide

### For Backend Services

**Before:**
```typescript
return QuestResponseDto.fromEntity(quest);
```

**After:**
```typescript
return QuestMapper.toDto(quest);
```

### For Frontend Components

**Before:**
```typescript
const quest = apiResponse as Quest;
```

**After:**
```typescript
const quest = QuestMapper.toDomain(apiResponse);
```

## Future Enhancements

1. Add mappers for additional domains (Payouts, Notifications, etc.)
2. Implement validation in mappers
3. Add support for partial updates
4. Consider using a mapping library like AutoMapper if complexity grows
5. Add performance monitoring for mapping operations

## Contributing

When adding new mappers:

1. Follow the established pattern of static methods
2. Include both `toDto/toDomain` and `toDtoArray/toDomainArray` methods
3. Add comprehensive unit tests
4. Update this documentation
5. Ensure backward compatibility if replacing existing mapping logic
