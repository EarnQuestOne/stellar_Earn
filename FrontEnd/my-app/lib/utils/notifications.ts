export type NotificationType = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
}

export interface NotificationSettings {
  questUpdates: boolean;
  submissionStatus: boolean;
  rewardClaims: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  questUpdates: true,
  submissionStatus: true,
  rewardClaims: true,
  soundEnabled: true,
};
