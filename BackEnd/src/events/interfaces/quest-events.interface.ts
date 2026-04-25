export interface IQuestCreatedEvent {
    questId: string;
    title: string;
    creatorAddress: string;
    rewardAmount: string;
    metadata?: Record<string, any>;
}

export interface IQuestUpdatedEvent {
    questId: string;
    changes: Record<string, any>;
    updatedAt: Date;
}
