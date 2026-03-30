/**
 * Submissions API – using the centralised Axios client.
 *
 * Endpoints:
 *  GET  /quests/:questId/submissions           – list submissions for a quest
 *  GET  /quests/:questId/submissions/:id       – single submission
 *  POST /quests/:questId/submissions           – submit proof (create)
 *  POST /quests/:questId/submissions/:id/approve – approve (verifier/admin)
 *  POST /quests/:questId/submissions/:id/reject  – reject  (verifier/admin)
 *  POST /submissions/upload                    – upload large proof file
 */

import {
  get,
  post,
  withRetry,
  apiClient,
  createCancelToken,
  type CancelToken,
} from './client';
import type {
  SubmissionResponse,
  CreateSubmissionRequest,
  ApproveSubmissionRequest,
  RejectSubmissionRequest,
  UploadProofResponse,
  ProofPayload,
  PaginationParams,
} from '@/lib/types/api.types';
import type { ProofType } from '@/lib/validation/submission';

// Re-export legacy shapes so existing hooks keep compiling
export type { CreateSubmissionRequest as CreateSubmissionData } from '@/lib/types/api.types';

export interface CreateSubmissionData {
  questId: string;
  proofType: ProofType;
  proof: {
    type: ProofType;
    link?: string;
    text?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    fileContent?: string;
  };
  additionalNotes?: string;
}

export interface SubmissionFilters {
  status?: string;
}

// ---------------------------------------------------------------------------
// List submissions for a quest
// ---------------------------------------------------------------------------

export async function getQuestSubmissions(
  questId: string,
  cancelToken?: CancelToken,
): Promise<{ submissions: SubmissionResponse[]; total: number }> {
  return withRetry(() =>
    get<{ success: boolean; data: { submissions: SubmissionResponse[]; total: number } }>(
      `/quests/${questId}/submissions`,
      { signal: cancelToken?.signal },
    ).then((res) => res.data),
  );
}

// ---------------------------------------------------------------------------
// Fetch user's own submissions (paginated list from /submissions)
// ---------------------------------------------------------------------------

export async function fetchSubmissions(
  filters?: SubmissionFilters,
  pagination?: PaginationParams,
  cancelToken?: CancelToken,
): Promise<{ data: SubmissionResponse[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
  const params: Record<string, string | number | undefined> = {};
  if (filters?.status) params.status = filters.status;
  if (pagination?.page) params.page = pagination.page;
  if (pagination?.limit) params.limit = pagination.limit;
  if (pagination?.cursor) params.cursor = pagination.cursor;

  return withRetry(() =>
    get<SubmissionResponse[]>('/submissions', {
      params,
      signal: cancelToken?.signal,
    }).then((data) => ({
      data,
      pagination: {
        page: pagination?.page ?? 1,
        limit: pagination?.limit ?? data.length,
        total: data.length,
        hasMore: false,
      },
    })),
  );
}

// ---------------------------------------------------------------------------
// Single submission
// ---------------------------------------------------------------------------

export async function getSubmission(
  questId: string,
  submissionId: string,
  cancelToken?: CancelToken,
): Promise<SubmissionResponse> {
  return withRetry(() =>
    get<{ success: boolean; data: { submission: SubmissionResponse } }>(
      `/quests/${questId}/submissions/${submissionId}`,
      { signal: cancelToken?.signal },
    ).then((res) => res.data.submission),
  );
}

// ---------------------------------------------------------------------------
// Create submission (submit proof)
// ---------------------------------------------------------------------------

/**
 * Submit proof for a quest.
 * Handles link / text proof inline; for file proof pass `file` separately.
 */
export async function createSubmission(
  data: CreateSubmissionData,
  file?: File | null,
): Promise<SubmissionResponse> {
  const proof: ProofPayload = { type: data.proofType };

  if (data.proofType === 'link' && data.proof.link) {
    proof.link = data.proof.link;
  }

  if (data.proofType === 'text' && data.proof.text) {
    proof.text = data.proof.text;
  }

  if (data.proofType === 'file' && file) {
    proof.fileName = file.name;
    proof.fileSize = file.size;
    proof.fileType = file.type;
    // Include base64 content for files ≤ 5 MB; larger files use uploadProofFile()
    if (file.size <= 5 * 1024 * 1024) {
      proof.fileContent = await fileToBase64(file);
    }
  }

  const payload: CreateSubmissionRequest = {
    questId: data.questId,
    proof,
    additionalNotes: data.additionalNotes,
  };

  return post<SubmissionResponse>(
    `/quests/${data.questId}/submissions`,
    payload,
  );
}

// ---------------------------------------------------------------------------
// Approve / Reject (verifier / admin)
// ---------------------------------------------------------------------------

export async function approveSubmission(
  questId: string,
  submissionId: string,
  payload?: ApproveSubmissionRequest,
): Promise<SubmissionResponse> {
  return post<{ success: boolean; data: { submission: SubmissionResponse } }>(
    `/quests/${questId}/submissions/${submissionId}/approve`,
    payload ?? {},
  ).then((res) => res.data.submission);
}

export async function rejectSubmission(
  questId: string,
  submissionId: string,
  payload: RejectSubmissionRequest,
): Promise<SubmissionResponse> {
  return post<{ success: boolean; data: { submission: SubmissionResponse } }>(
    `/quests/${questId}/submissions/${submissionId}/reject`,
    payload,
  ).then((res) => res.data.submission);
}

// ---------------------------------------------------------------------------
// Upload large proof file (XHR for progress tracking)
// ---------------------------------------------------------------------------

/**
 * Upload a file proof directly using XHR so we can track upload progress.
 * Returns the file URL and ID to attach to a subsequent createSubmission call.
 */
export async function uploadProofFile(
  questId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadProofResponse> {
  const token = (await import('./client')).tokenManager.getAccessToken();
  if (!token) {
    throw new Error('Authentication required. Please connect your wallet.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('questId', questId);

  const baseURL =
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  return new Promise<UploadProofResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadProofResponse);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${baseURL}/api/v1/submissions/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

async function fileToBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
