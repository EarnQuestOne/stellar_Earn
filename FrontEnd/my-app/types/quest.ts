export interface Quest {
  id: string;
  title: string;
  status: 'available' | 'in_progress' | 'completed' | 'claimed';
  progress: number; // 0 - 100
  rewardAmount: number;
}

export interface QuestActionResult {
  success: boolean;
  quest: Quest;
}