import { Logger } from '@nestjs/common';

export function Retry(maxAttempts: number = 3, delayMs: number = 1000) {
    const logger = new Logger('RetryDecorator');

    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            let lastError: Error = new Error('Unknown error during retry');

            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await originalMethod.apply(this, args);
                } catch (error) {
                    lastError = error;
                    logger.warn(
                        `Attempt ${attempt} for ${propertyKey} failed: ${error.message}. ` +
                        (attempt < maxAttempts ? `Retrying in ${delayMs}ms...` : 'Max attempts reached.')
                    );

                    if (attempt < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, delayMs));
                    }
                }
            }

            throw lastError;
        };

        return descriptor;
    };
}
