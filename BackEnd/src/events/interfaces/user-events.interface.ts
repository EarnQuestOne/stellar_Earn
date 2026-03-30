export interface IUserLevelUpEvent {
    userId: string;
    oldLevel: number;
    newLevel: number;
    unlockedFeatures?: string[];
    levelUpAt: Date;
}

export interface IReputationChangedEvent {
    userId: string;
    oldReputation: number;
    newReputation: number;
    reason: string;
    changedAt: Date;
}
