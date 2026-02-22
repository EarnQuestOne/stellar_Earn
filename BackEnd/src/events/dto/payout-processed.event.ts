import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class PayoutProcessedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly payoutId: string;

    @IsString()
    @IsNotEmpty()
    public readonly stellarAddress: string;

    @IsNumberString()
    public readonly amount: string;

    @IsString()
    @IsNotEmpty()
    public readonly transactionHash: string;

    constructor(payoutId: string, stellarAddress: string, amount: string, transactionHash: string) {
        super();
        this.payoutId = payoutId;
        this.stellarAddress = stellarAddress;
        this.amount = amount;
        this.transactionHash = transactionHash;
    }
}
