import { Quest } from '../entities/quest.entity';
import { QuestResponseDto } from '../dto/quest-response.dto';

/**
 * Quest Mapper
 *
 * Explicit mapper functions to convert between Quest entities and DTOs.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class QuestMapper {
  /**
   * Convert a Quest entity to a QuestResponseDto
   * @param quest - The quest entity to convert
   * @returns The quest response DTO
   */
  static toDto(quest: Quest): QuestResponseDto {
    const dto = new QuestResponseDto();
    dto.id = quest.id;
    dto.title = quest.title;
    dto.description = quest.description;
    dto.rewardAmount = quest.rewardAmount;
    dto.status = quest.status;
    dto.createdBy = quest.createdBy;
    dto.createdAt = quest.createdAt;
    dto.updatedAt = quest.updatedAt;
    dto.difficulty = quest.difficulty;
    return dto;
  }

  /**
   * Convert an array of Quest entities to QuestResponseDto array
   * @param quests - Array of quest entities to convert
   * @returns Array of quest response DTOs
   */
  static toDtoArray(quests: Quest[]): QuestResponseDto[] {
    return quests.map((quest) => this.toDto(quest));
  }

  /**
   * Convert a Quest entity to a QuestResponseDto (legacy alias for backward compatibility)
   * @deprecated Use toDto instead
   */
  static fromEntity(quest: Quest): QuestResponseDto {
    return this.toDto(quest);
  }
}
