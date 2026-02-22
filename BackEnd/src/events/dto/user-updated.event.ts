import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsArray } from 'class-validator';

export class UserUpdatedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly userId: string;

    @IsArray()
    @IsString({ each: true })
    public readonly updatedFields: string[];

    constructor(userId: string, updatedFields: string[]) {
        super();
        this.userId = userId;
        this.updatedFields = updatedFields;
    }
}
