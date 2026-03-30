import { Injectable } from '@nestjs/common';

@Injectable()
export class RetryService {
  async retry<T>(
    fn: () => Promise<T> | T,
    options: { attempts: number; delay: number },
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= options.attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < options.attempts) {
          await this.delay(options.delay * attempt);
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}