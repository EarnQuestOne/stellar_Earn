import React, { useMemo } from 'react';
import { runtimeEnv, AppEnvironment } from '../utils/env/lazyEnvValidator';
import { AlertCircle, ShieldAlert } from 'lucide-react';

interface EnvSafeBoundaryProps {
    requiredKeys: (keyof AppEnvironment)[];
    children: React.ReactNode;
}

export const EnvSafeBoundary: React.FC<EnvSafeBoundaryProps> = ({ requiredKeys, children }) => {
    const report = useMemo(() => runtimeEnv.inspectBoundary(requiredKeys), [requiredKeys]);

    if (!report.isConfigured) {
        return (
            <div className="rounded-lg border border-rose-900/50 bg-rose-950/20 p-5 text-white font-mono text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-bold uppercase tracking-wider mb-2">
                    <ShieldAlert className="h-4 w-4" />
                    Boundary Connection Blocked
                </div>
                <p className="text-slate-300 mb-3">
                    This subsystem component failed to initialize because required environment variables are missing.
                </p>
                <div className="bg-slate-950/60 p-3 rounded border border-slate-800 text-rose-300">
                    <span className="font-semibold block mb-1 text-slate-400">Missing Dependency Footprints:</span>
                    {report.missingKeys.map((key) => (
                        <div key={key} className="flex items-center gap-1.5 py-0.5">
                            <AlertCircle className="h-3 w-3 text-rose-500" />
                            <span>NEXT_PUBLIC_{key}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return <>{children}</>;
};