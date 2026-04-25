import type { SubmissionResponse } from '@/lib/types/api.types';

function deterministicHash(seed: number): string {
  return `0x${seed.toString(16).padStart(64, '0')}`;
}

function deterministicReward(seed: number): string {
  // 50..249 deterministic range
  return (50 + ((seed * 37) % 200)).toString();
}

export const mockSubmissions: SubmissionResponse[] = [
  {
    id: 'SUB-001',
    questId: 'quest-001',
    userId: 'user-001',
    status: 'Approved',
    proof: { hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd' },
    createdAt: '2024-01-15T14:32:00Z',
    updatedAt: '2024-01-15T14:32:00Z',
    quest: {
      id: 'quest-001',
      title: 'Smart Contract Security Review',
      rewardAmount: '250',
      rewardAsset: 'XLM',
    },
  },
  {
    id: 'SUB-002',
    questId: 'quest-002',
    userId: 'user-001',
    status: 'Pending',
    proof: {},
    createdAt: '2024-01-14T09:15:00Z',
    updatedAt: '2024-01-14T09:15:00Z',
    quest: {
      id: 'quest-002',
      title: 'Documentation Update',
      rewardAmount: '75',
      rewardAsset: 'XLM',
    },
  },
  {
    id: 'SUB-003',
    questId: 'quest-003',
    userId: 'user-001',
    status: 'Pending', // 'UNDER_REVIEW' is not in SubmissionResponse status type in api.types.ts, mapping to Pending
    proof: {},
    createdAt: '2024-01-13T16:45:00Z',
    updatedAt: '2024-01-13T16:45:00Z',
    quest: {
      id: 'quest-003',
      title: 'UI Component Library',
      rewardAmount: '150',
      rewardAsset: 'XLM',
    },
  },
  {
    id: 'SUB-004',
    questId: 'quest-004',
    userId: 'user-001',
    status: 'Approved',
    proof: { hash: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12' },
    createdAt: '2024-01-12T11:20:00Z',
    updatedAt: '2024-01-12T11:20:00Z',
    quest: {
      id: 'quest-004',
      title: 'Bug Fix: Wallet Connection',
      rewardAmount: '100',
      rewardAsset: 'XLM',
    },
  },
  {
    id: 'SUB-005',
    questId: 'quest-005',
    userId: 'user-001',
    status: 'Rejected',
    proof: {},
    rejectionReason: 'Proof does not meet requirements',
    createdAt: '2024-01-11T08:00:00Z',
    updatedAt: '2024-01-11T08:00:00Z',
    quest: {
      id: 'quest-005',
      title: 'API Rate Limiting',
      rewardAmount: '50',
      rewardAsset: 'XLM',
    },
  },
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `SUB-${String(i + 6).padStart(3, '0')}`,
    questId: `quest-${i + 6}`,
    userId: 'user-001',
    status: 'Approved' as const,
    proof: { hash: deterministicHash(i + 6) },
    createdAt: new Date(2024, 0, 10 - i).toISOString(),
    updatedAt: new Date(2024, 0, 10 - i).toISOString(),
    quest: {
      id: `quest-${i + 6}`,
      title: `Quest ${i + 6}`,
      rewardAmount: deterministicReward(i + 6),
      rewardAsset: 'XLM',
    },
  })),
];

export function getSubmissionStats(submissions: SubmissionResponse[]) {
  const total = submissions.length;
  const approved = submissions.filter((s) => s.status === 'Approved').length;
  const pending = submissions.filter((s) => s.status === 'Pending').length;
  const rejected = submissions.filter((s) => s.status === 'Rejected').length;
  const paid = submissions.filter((s) => s.status === 'Paid').length;

  return {
    total,
    approved,
    pending,
    rejected,
    paid,
  };
}
