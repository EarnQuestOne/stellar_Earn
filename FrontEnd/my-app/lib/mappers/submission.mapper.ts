import type { SubmissionResponse } from '../types/api.types';
import type { Submission } from '../types/submission';

/**
 * Submission Mapper
 *
 * Explicit mapper functions to convert between API DTOs and UI domain models.
 * This provides a clean separation of concerns and makes mapping logic testable.
 */
export class SubmissionMapper {
  /**
   * Convert API SubmissionResponse to UI Submission domain model
   * @param apiSubmission - The API submission response
   * @returns The UI submission domain model
   */
  static toDomain(apiSubmission: SubmissionResponse): Submission {
    return {
      id: apiSubmission.id,
      questId: apiSubmission.questId,
      userId: apiSubmission.userId,
      status: apiSubmission.status as Submission['status'],
      createdAt: apiSubmission.createdAt,
      updatedAt: apiSubmission.updatedAt,
      quest: apiSubmission.quest,
      user: apiSubmission.user,
      proof: apiSubmission.proof,
      rejectionReason: apiSubmission.rejectionReason,
      approvedAt: apiSubmission.approvedAt,
      approvedBy: apiSubmission.approvedBy,
      rejectedAt: apiSubmission.rejectedAt,
      rejectedBy: apiSubmission.rejectedBy,
    };
  }

  /**
   * Convert array of API SubmissionResponse to UI Submission domain models
   * @param apiSubmissions - Array of API submission responses
   * @returns Array of UI submission domain models
   */
  static toDomainArray(apiSubmissions: SubmissionResponse[]): Submission[] {
    return apiSubmissions.map((submission) => this.toDomain(submission));
  }

  /**
   * Convert UI Submission domain model to API SubmissionResponse
   * @param domainSubmission - The UI submission domain model
   * @returns The API submission response
   */
  static toApi(domainSubmission: Submission): SubmissionResponse {
    return {
      id: domainSubmission.id,
      questId: domainSubmission.questId,
      userId: domainSubmission.userId,
      status: domainSubmission.status as SubmissionResponse['status'],
      createdAt: domainSubmission.createdAt,
      updatedAt: domainSubmission.updatedAt,
      quest: domainSubmission.quest,
      user: domainSubmission.user,
      proof: domainSubmission.proof,
      rejectionReason: domainSubmission.rejectionReason,
      approvedAt: domainSubmission.approvedAt,
      approvedBy: domainSubmission.approvedBy,
      rejectedAt: domainSubmission.rejectedAt,
      rejectedBy: domainSubmission.rejectedBy,
    };
  }

  /**
   * Convert array of UI Submission domain models to API SubmissionResponse
   * @param domainSubmissions - Array of UI submission domain models
   * @returns Array of API submission responses
   */
  static toApiArray(domainSubmissions: Submission[]): SubmissionResponse[] {
    return domainSubmissions.map((submission) => this.toApi(submission));
  }
}
