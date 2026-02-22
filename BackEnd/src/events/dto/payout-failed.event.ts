import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty } from 'class-validator';

export class PayoutFailedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly payoutId: string;

    @IsString()
    @IsNotEmpty()
    public readonly stellarAddress: string;

    @IsString()
    public readonly reason: string;

    constructor(payoutId: string, stellarAddress: string, reason: string) {
        super();
        this.payoutId = payoutId;
        this.stellarAddress = stellarAddress;
        this.reason = reason;
    }
}
