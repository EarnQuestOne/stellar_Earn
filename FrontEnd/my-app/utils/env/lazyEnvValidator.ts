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
 * Features production log isolation parameters to protect bundle hygiene.
 */
export class LazyEnvValidator {
    private cache: Partial<AppEnvironment> = {};
    private defaults: Partial<AppEnvironment> = {
        STELLAR_NETWORK_PASSPHRASE: "Standalone Network ; Open核心 ; July 2022",
        ENABLE_DEBUG_LOGS: false,
    };

    /**
     * Internal logging pipe that strips structural warnings out of production builds
     */
    private writeLogDiagnostic(message: string, isError = false): void {
        if (process.env.NODE_ENV === 'production') {
            return; 
        }

        try {
            if (!this.get('ENABLE_DEBUG_LOGS') && !isError) {
                return;
            }
        } catch {
            // Prevent execution loops during configuration extraction
        }

        if (isError) {
            console.error(`[ENV-ERROR] ${message}`);
        } else {
            console.warn(`[ENV-DEBUG] ${message}`);
        }
    }

    /**
     * Resolves a key lazily from the runtime process context
     */
    public get<K extends keyof AppEnvironment>(key: K): AppEnvironment[K] {
        if (this.cache[key] !== undefined) {
            return this.cache[key] as AppEnvironment[K];
        }

        const rawValue = process.env[`NEXT_PUBLIC_${key}`] || process.env[key];

        if (rawValue === undefined || rawValue === '') {
            if (this.defaults[key] !== undefined) {
                this.cache[key] = this.defaults[key];
                this.writeLogDiagnostic(`Fallback default value map loaded for optional key parameter: "${key}"`);
                return this.cache[key] as AppEnvironment[K];
            }
            
            this.writeLogDiagnostic(`Strict boundary failure resolving mandatory token: "${key}"`, true);
            throw new Error(
                `[ENV-BOUNDARY-FAULT] Lazy resolution failed for key: "${key}". Context boundary requires configuration parameters.`
            );
        }

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

    public purgeCache(): void {
        this.cache = {};
    }
}

export const runtimeEnv = new LazyEnvValidator();