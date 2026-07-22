import { Submission } from '../entities/submission.entity';
import { SubmissionDataDto, SubmissionQuestInfoDto, SubmissionUserInfoDto } from '../dto/submission-response.dto';

/**
 * Submission Mapper
 * 
 * Explicit mapper functions to convert between Submission entities and DTOs.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class SubmissionMapper {
  /**
   * Convert a Submission entity to a SubmissionDataDto
   * @param submission - The submission entity to convert
   * @returns The submission data DTO
   */
  static toDto(submission: Submission): SubmissionDataDto {
    const dto = new SubmissionDataDto();
    dto.id = submission.id;
    dto.status = submission.status;
    dto.approvedAt = submission.approvedAt ?? undefined;
    dto.approvedBy = submission.approvedBy ?? undefined;
    dto.rejectedAt = submission.rejectedAt ?? undefined;
    dto.rejectedBy = submission.rejectedBy ?? undefined;
    dto.rejectionReason = submission.rejectionReason ?? undefined;
    
    // Map quest info
    dto.quest = this.toQuestInfoDto(submission.quest);
    
    // Map user info
    dto.user = this.toUserInfoDto(submission.user);
    
    return dto;
  }

  /**
   * Convert an array of Submission entities to SubmissionDataDto array
   * @param submissions - Array of submission entities to convert
   * @returns Array of submission data DTOs
   */
  static toDtoArray(submissions: Submission[]): SubmissionDataDto[] {
    return submissions.map(submission => this.toDto(submission));
  }

  /**
   * Convert quest entity to SubmissionQuestInfoDto
   * @param quest - The quest entity
   * @returns The quest info DTO
   */
  static toQuestInfoDto(quest: any): SubmissionQuestInfoDto {
    const dto = new SubmissionQuestInfoDto();
    dto.id = quest.id;
    dto.title = quest.title;
    dto.rewardAmount = quest.rewardAmount;
    return dto;
  }

  /**
   * Convert user entity to SubmissionUserInfoDto
   * @param user - The user entity
   * @returns The user info DTO
   */
  static toUserInfoDto(user: any): SubmissionUserInfoDto {
    const dto = new SubmissionUserInfoDto();
    dto.id = user.id;
    dto.stellarAddress = user.stellarAddress;
    return dto;
  }
}
