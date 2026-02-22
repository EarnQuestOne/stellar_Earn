import { IsDate } from 'class-validator';

export abstract class BaseEvent {
    @IsDate()
    public readonly timestamp: Date;

    constructor() {
        this.timestamp = new Date();
    }
}
