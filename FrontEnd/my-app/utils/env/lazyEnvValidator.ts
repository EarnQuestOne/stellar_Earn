/**
 * Type-safe environment definition layout rules
 */
export interface AppEnvironment {
    SOROBAN_RPC_URL: string;
    STELLAR_NETWORK_PASSPHRASE: string;
    VAULT_AGENT_ENDPOINT?: string;
    ENABLE_DEBUG_LOGS: boolean;
}

export interface EnvValidationReport {
    isConfigured: boolean;
    missingKeys: string[];
    activeValues: Partial<AppEnvironment>;
}

/**
 * Lazy Environment Boundary Evaluator
 * Binds keys to execution contexts without throwing unhandled exceptions at boot time.
 */
export class LazyEnvValidator {
    private cache: Partial<AppEnvironment> = {};
    private defaults: Partial<AppEnvironment> = {
        STELLAR_NETWORK_PASSPHRASE: "Standalone Network ; Open核心 ; July 2022",
        ENABLE_DEBUG_LOGS: false,
    };

    /**
     * Resolves a key lazily from the runtime process context
     */
    public get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
        if (this.cache[key] !== undefined) {
            return this.cache[key] as AppEnvironment[K];
        }

        const rawValue = process.env[`NEXT_PUBLIC_${key}`] || process.env[key];

        if (rawValue === undefined || rawValue === '') {
            // Apply fallback tracking bounds instead of hard throwing execution signals
            if (this.defaults[key] !== undefined) {
                this.cache[key] = this.defaults[key];
                return this.cache[key] as AppEnvironment[K];
            }
            
            throw new Error(
                `[ENV-BOUNDARY-FAULT] Lazy resolution failed for key: "${key}". Context boundary requires configuration parameters.`
            );
        }

        // Handle primitive cast requirements cleanly
        if (typeof this.defaults[key] === 'boolean') {
            this.cache[key] = (rawValue === 'true' || rawValue === '1') as any;
        } else {
            this.cache[key] = rawValue as any;
        }

        return this.cache[key] as AppEnvironment[K];
    }

    /**
     * Inspects active runtime definitions without breaking current process frames
     */
    public inspectBoundary(keys: (keyof AppEnvironment)[]): EnvValidationReport {
        const missingKeys: string[] = [];
        const activeValues: Partial<AppEnvironment> = {};

        keys.forEach((key) => {
            try {
                activeValues[key] = this.get(key) as any;
            } catch {
                missingKeys.push(key);
            }
        });

        return {
            isConfigured: missingKeys.length === 0,
            missingKeys,
            activeValues,
        };
    }

    /**
     * Clears internal state parameters for testing environments
     */
    public purgeCache(): void {
        this.cache = {};
    }
}

// Export global singleton matrix for component consumption passes
export const runtimeEnv = new LazyEnvValidator();