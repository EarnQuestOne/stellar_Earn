export interface ISubmissionReceivedEvent {
    submissionId: string;
    questId: string;
    userId: string;
    content: string;
    submittedAt: Date;
}

export interface ISubmissionApprovedEvent {
    submissionId: string;
    questId: string;
    userId: string;
    approvedBy: string;
    approvedAt: Date;
}

export interface IPayoutProcessedEvent {
    payoutId: string;
    questId: string;
    userId: string;
    amount: string;
    asset: string;
    transactionHash: string;
    processedAt: Date;
}
