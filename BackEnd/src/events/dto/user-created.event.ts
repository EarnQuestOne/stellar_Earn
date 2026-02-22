import { BaseEvent } from './base.event';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UserCreatedEvent extends BaseEvent {
    @IsString()
    @IsNotEmpty()
    public readonly userId: string;

    @IsString()
    @IsNotEmpty()
    public readonly username: string;

    @IsEmail()
    public readonly email: string;

    @IsString()
    @IsOptional()
    public readonly stellarAddress: string | null;

    constructor(
        userId: string,
        username: string,
        email: string,
        stellarAddress: string | null,
    ) {
        super();
        this.userId = userId;
        this.username = username;
        this.email = email;
        this.stellarAddress = stellarAddress;
    }
}
