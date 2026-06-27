import { LazyEnvValidator } from '../lazyEnvValidator';

describe('LazyEnvValidator Isolation Execution Matrix', () => {
    let validator: LazyEnvValidator;
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
        validator = new LazyEnvValidator();
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should resolve defined parameters lazily from runtime env chains', () => {
        process.env.SOROBAN_RPC_URL = 'https://localhost:8000';
        expect(validator.get('SOROBAN_RPC_URL')).toBe('https://localhost:8000');
    });

    it('should drop back cleanly to registered fallbacks if optional fields are missing', () => {
        expect(validator.get('ENABLE_DEBUG_LOGS')).toBe(false);
    });

    it('should trigger isolated boundary faults only when key evaluation is explicitly executed', () => {
        // App loading doesn't throw here even with missing configurations
        const checkAction = () => validator.get('SOROBAN_RPC_URL');
        expect(checkAction).toThrow('[ENV-BOUNDARY-FAULT]');
    });

    it('should compile an accurate system report when inspecting runtime parameters', () => {
        process.env.SOROBAN_RPC_URL = 'https://localhost:8000';
        const report = validator.inspectBoundary(['SOROBAN_RPC_URL', 'STELLAR_NETWORK_PASSPHRASE']);
        
        expect(report.isConfigured).toBe(true);
        expect(report.missingKeys).toHaveLength(0);
    });
});