import { describe, it, expect, vi } from 'vitest';
import { LazyInitializer } from './lazy-initializer';

describe('LazyInitializer', () => {
  it('should not call the factory function upon instantiation', () => {
    const factory = vi.fn(() => ({ data: 'test' }));
    
    // Act: Create the wrapper
    new LazyInitializer(factory);
    
    // Assert: Factory was never called
    expect(factory).not.toHaveBeenCalled();
  });

  it('should call the factory exactly once upon the first getInstance call', () => {
    const mockService = { id: 'service-1' };
    const factory = vi.fn(() => mockService);
    const lazy = new LazyInitializer(factory);

    // Act: Request instance multiple times
    const instance1 = lazy.getInstance();
    const instance2 = lazy.getInstance();
    const instance3 = lazy.getInstance();

    // Assert: Factory called exactly once
    expect(factory).toHaveBeenCalledTimes(1);
    
    // Assert: Every call returned the exact same instance
    expect(instance1).toBe(mockService);
    expect(instance2).toBe(mockService);
    expect(instance3).toBe(mockService);
  });

  it('should be type-safe', () => {
    const lazy = new LazyInitializer<number>(() => 42);
    const val: number = lazy.getInstance();
    expect(val).toBe(42);
  });
});