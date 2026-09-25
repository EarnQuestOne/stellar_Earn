import { get, post } from './client';

export type DisputeStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'APPEALED'
  | 'WITHDRAWN';

export interface Dispute {
  id: string;
  questId: string;
  submissionId: string;
  initiatorAddress: string;
  arbitratorAddress: string;
  status: DisputeStatus;
  upheld: boolean | null;
  slashBps: number | null;
  openTransactionHash: string | null;
  appealTransactionHash: string | null;
  resolutionTransactionHash: string | null;
  filedAt: string | null;
  resolvedAt: string | null;
}

export const disputesApi = {
  list: () => get<Dispute[]>('/disputes'),
  get: (id: string) => get<Dispute>(`/disputes/${id}`),
  open: (submissionId: string, arbitratorAddress: string) =>
    post<Dispute>('/disputes', { submissionId, arbitratorAddress }),
  appeal: (id: string, newArbitratorAddress: string) =>
    post<Dispute>(`/disputes/${id}/appeal`, { newArbitratorAddress }),
  resolve: (id: string, upheld: boolean, slashBps = 0) =>
    post<Dispute>(`/disputes/${id}/resolve`, { upheld, slashBps }),
};
