import { HttpException, HttpStatus } from '@nestjs/common';

export class QuestNotFoundException extends HttpException {
  constructor(questId: string) {
    super(`Quest '${questId}' not found`, HttpStatus.NOT_FOUND);
  }
}

export class QuestAlreadyExistsException extends HttpException {
  constructor(questId: string) {
    super(`Quest '${questId}' already exists`, HttpStatus.CONFLICT);
  }
}

export class QuestExpiredException extends HttpException {
  constructor(questId: string) {
    super(`Quest '${questId}' has expired`, HttpStatus.GONE);
  }
}

export class SubmissionNotFoundException extends HttpException {
  constructor(submissionId: string) {
    super(`Submission '${submissionId}' not found`, HttpStatus.NOT_FOUND);
  }
}

export class SubmissionAlreadyExistsException extends HttpException {
  constructor(questId: string, userId: string) {
    super(
      `User '${userId}' already submitted for quest '${questId}'`,
      HttpStatus.CONFLICT,
    );
  }
}

export class UnauthorizedActionException extends HttpException {
  constructor(action: string) {
    super(`Unauthorized to perform action: ${action}`, HttpStatus.FORBIDDEN);
  }
}

export class InsufficientFundsException extends HttpException {
  constructor() {
    super('Insufficient funds for this operation', HttpStatus.PAYMENT_REQUIRED);
  }
}

export class InvalidStellarAddressException extends HttpException {
  constructor(address: string) {
    super(`Invalid Stellar address: ${address}`, HttpStatus.BAD_REQUEST);
  }
}

export class PayoutFailedException extends HttpException {
  constructor(reason: string) {
    super(`Payout failed: ${reason}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class UserNotFoundException extends HttpException {
  constructor(userId: string) {
    super(`User '${userId}' not found`, HttpStatus.NOT_FOUND);
  }
}
