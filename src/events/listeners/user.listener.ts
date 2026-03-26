import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRegisteredEvent, UserVerifiedEvent } from '../dto/user.event';
import { eventConfig } from '../../config/events.config';

@Injectable()
export class UserListener {
  @OnEvent(eventConfig.events.user.registered)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    console.log(`[EVENT] User registered: ${event.userId}`);
  }

  @OnEvent(eventConfig.events.user.verified)
  async handleUserVerified(event: UserVerifiedEvent): Promise<void> {
    console.log(`[EVENT] User verified: ${event.userId}`);
  }
}