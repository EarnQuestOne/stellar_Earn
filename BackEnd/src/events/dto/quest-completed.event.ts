import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsNumber, IsNumberString } from 'class-validator';

export class QuestCompletedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly questId: string;

    @IsString()
    @IsNotEmpty()
    public readonly userId: string;

    @IsNumber()
    public readonly xpEarned: number;

    @IsNumberString()
    public readonly rewardAmount: string;

    constructor(
        questId: string,
        userId: string,
        xpEarned: number,
        rewardAmount: string,
    ) {
        super();
        this.questId = questId;
        this.userId = userId;
        this.xpEarned = xpEarned;
        this.rewardAmount = rewardAmount;
    }
}
