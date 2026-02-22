import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty } from 'class-validator';

export class QuestDeletedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly questId: string;

    @IsString()
    @IsNotEmpty()
    public readonly creatorAddress: string;

    constructor(questId: string, creatorAddress: string) {
        super();
        this.questId = questId;
        this.creatorAddress = creatorAddress;
    }
}
