import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class QuestCreatedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly questId: string;

    @IsString()
    @IsNotEmpty()
    public readonly title: string;

    @IsString()
    @IsNotEmpty()
    public readonly creatorAddress: string;

    @IsNumberString()
    public readonly rewardAmount: string;

    constructor(
        questId: string,
        title: string,
        creatorAddress: string,
        rewardAmount: string,
    ) {
        super();
        this.questId = questId;
        this.title = title;
        this.creatorAddress = creatorAddress;
        this.rewardAmount = rewardAmount;
    }
}
