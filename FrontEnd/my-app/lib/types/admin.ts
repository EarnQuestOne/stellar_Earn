

export interface AdminStats {
  totalQuests: number;
  activeQuests: number;
  completedQuests: number;
  totalParticipants: number;
  totalRewardsDistributed: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
}

export interface AdminUser {
  id: string;
  stellarAddress: string;
  username: string;
  role: 'admin' | 'super_admin';
  permissions: string[];
}

export interface BulkOperation {
  action: 'activate' | 'pause' | 'complete' | 'cancel' | 'delete';
  questIds: string[];
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
