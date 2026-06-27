import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { LazyEnvValidator } from "../utils/env/lazyEnvValidator";

// Extract explicit spy utility types from the Jest globals package layout
type SpyInstanceType = ReturnType<typeof jest.spyOn>;

describe('LazyEnvValidator Telemetry Silence Suite', () => {
    let validator: LazyEnvValidator;
    let warnSpy: SpyInstanceType;
    let errorSpy: SpyInstanceType;
    const originalNodeEnv = process.env.NODE_ENV;

    // Helper utility to safely bypass read-only restrictions on process.env properties
    const setNodeEnv = (value: string | undefined) => {
        Object.defineProperty(process.env, 'NODE_ENV', {
            value,
            configurable: true,
            writable: true
        });
    };

    beforeEach(() => {
        validator = new LazyEnvValidator();
        // Explicitly cast to prevent strict structural mismatch assignments
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}) as unknown as SpyInstanceType;
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}) as unknown as SpyInstanceType;
    });

    afterEach(() => {
        setNodeEnv(originalNodeEnv);
        delete process.env.ENABLE_DEBUG_LOGS;
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('should completely suppress warnings when process.env.NODE_ENV matches production', () => {
        setNodeEnv('production');
        
        // Trigger implicit lookup fallback sequence
        validator.get('ENABLE_DEBUG_LOGS');
        
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should permit diagnostic traces inside development domains if debug mode is active', () => {
        setNodeEnv('development');
        process.env.ENABLE_DEBUG_LOGS = 'true';
        
        validator.get('ENABLE_DEBUG_LOGS');
        
        expect(warnSpy).toHaveBeenCalled();
    });
});