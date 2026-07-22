import type { QuestResponse } from '../types/api.types';
import type { Quest } from '../types/quest';

/**
 * Quest Mapper
 *
 * Explicit mapper functions to convert between API DTOs and UI domain models.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class QuestMapper {
  /**
   * Convert API QuestResponse to UI Quest domain model
   * @param apiQuest - The API quest response
   * @returns The UI quest domain model
   */
  static toDomain(apiQuest: QuestResponse): Quest {
    return {
      ...apiQuest,
      status: apiQuest.status as Quest['status'],
      difficulty: apiQuest.difficulty as Quest['difficulty'],
    };
  }

  /**
   * Convert array of API QuestResponse to UI Quest domain models
   * @param apiQuests - Array of API quest responses
   * @returns Array of UI quest domain models
   */
  static toDomainArray(apiQuests: QuestResponse[]): Quest[] {
    return apiQuests.map((quest) => this.toDomain(quest));
  }

  /**
   * Convert UI Quest domain model to API QuestResponse
   * @param domainQuest - The UI quest domain model
   * @returns The API quest response
   */
  static toApi(domainQuest: Quest): QuestResponse {
    return {
      ...domainQuest,
      status: domainQuest.status as QuestResponse['status'],
      difficulty: domainQuest.difficulty as QuestResponse['difficulty'],
    };
  }

  /**
   * Convert array of UI Quest domain models to API QuestResponse
   * @param domainQuests - Array of UI quest domain models
   * @returns Array of API quest responses
   */
  static toApiArray(domainQuests: Quest[]): QuestResponse[] {
    return domainQuests.map((quest) => this.toApi(quest));
  }
}
