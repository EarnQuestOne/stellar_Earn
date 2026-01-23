import type {
  Submission,
  SubmissionFilters,
  PaginationParams,
  PaginatedResponse,
} from '../types/submission';
import type { ProofType } from '../validation/submission';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
    fileContent?: string; // Base64 encoded for small files
  };
  additionalNotes?: string;
}

export interface CreateSubmissionResponse {
  id: string;
  questId: string;
  userId: string;
  status: string;
  proof: Record<string, unknown>;
  createdAt: string;
}

/**
 * Get authentication token from localStorage or session
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

/**
 * Build query string from filters and pagination params
 */
function buildQueryString(
  filters?: SubmissionFilters,
  pagination?: PaginationParams,
): string {
  const params = new URLSearchParams();

  if (filters?.status) {
    params.append('status', filters.status);
  }

  if (pagination?.page) {
    params.append('page', pagination.page.toString());
  }

  if (pagination?.limit) {
    params.append('limit', pagination.limit.toString());
  }

  if (pagination?.cursor) {
    params.append('cursor', pagination.cursor);
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetch user submissions from the backend API
 */
export async function fetchSubmissions(
  filters?: SubmissionFilters,
  pagination?: PaginationParams,
): Promise<PaginatedResponse<Submission>> {
  const token = getAuthToken();
  const queryString = buildQueryString(filters, pagination);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/submissions${queryString}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch submissions: ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Handle different response formats
  if (Array.isArray(data)) {
    // If API returns array directly, wrap it
    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || data.length,
        total: data.length,
        hasMore: false,
      },
    };
  }

  // If API returns paginated response
  if (data.data && Array.isArray(data.data)) {
    return data as PaginatedResponse<Submission>;
  }

  // Fallback: wrap single object in array
  return {
    data: [data],
    pagination: {
      page: 1,
      limit: 1,
      total: 1,
      hasMore: false,
    },
  };
}

/**
 * Convert file to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create a new submission for a quest
 */
export async function createSubmission(
  data: CreateSubmissionData,
  file?: File | null
): Promise<CreateSubmissionResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required. Please connect your wallet.');
  }

  // Build proof object
  const proof: CreateSubmissionData['proof'] = {
    type: data.proofType,
  };

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
    // For smaller files, include base64 content
    // For larger files, you'd typically use a separate upload endpoint
    if (file.size <= 5 * 1024 * 1024) {
      // 5MB limit for base64
      proof.fileContent = await fileToBase64(file);
    }
  }

  const requestBody = {
    questId: data.questId,
    proof,
    additionalNotes: data.additionalNotes,
  };

  const response = await fetch(`${API_BASE_URL}/submissions/quests/${data.questId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to submit proof: ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Upload file separately (for large files)
 */
export async function uploadProofFile(
  questId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ fileUrl: string; fileId: string }> {
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required. Please connect your wallet.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('questId', questId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.message || 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${API_BASE_URL}/submissions/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Get a single submission by ID
 */
export async function getSubmission(submissionId: string): Promise<Submission> {
  const token = getAuthToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/submissions/${submissionId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Failed to fetch submission: ${response.statusText}`
    );
  }

  return response.json();
}
