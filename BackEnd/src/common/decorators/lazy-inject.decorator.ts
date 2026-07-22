import { ModuleRef } from '@nestjs/core';
import { LazyInitializer } from '../utils/lazy-initializer';

/**
 * Property decorator that lazily resolves a provider from the NestJS DI container.
 * Note: The host class must have "moduleRef: ModuleRef" injected in its constructor.
 *
 * @param token The injection token or class type to resolve.
 */
export function LazyInject(token: any) {
  return (target: any, propertyKey: string) => {
    const lazyInstanceKey = Symbol(`lazy_${propertyKey}`);

    Object.defineProperty(target, propertyKey, {
      get() {
        if (!this[lazyInstanceKey]) {
          // Access the moduleRef injected in the host class
          const moduleRef = this.moduleRef as ModuleRef;
          if (!moduleRef) {
            throw new Error(
              `LazyInject: "moduleRef" was not found on ${this.constructor.name}. ` +
                `You must inject ModuleRef into the constructor of this class.`,
            );
          }

          // Wrap the resolution logic in our LazyInitializer
          this[lazyInstanceKey] = new LazyInitializer(() =>
            moduleRef.get(token, { strict: false }),
          );
        }
        return this[lazyInstanceKey].getInstance();
      },
      enumerable: true,
      configurable: true,
    });
  };
}
