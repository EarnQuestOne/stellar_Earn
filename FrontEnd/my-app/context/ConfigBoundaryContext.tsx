'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ConfigurationBoundaryError } from '../lib/env-boundary';

interface Props {
  children: ReactNode;
  fallbackBoundaryName: string;
}

interface State {
  hasError: boolean;
  errorMessage: string | null;
}

export class ConfigBoundaryGuard extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: null
  };

  public static getDerivedStateFromError(error: Error): State {
    if (error instanceof ConfigurationBoundaryError) {
      return { hasError: true, errorMessage: error.message };
    }
    // Pass non-configuration exceptions to the global Next.js error handler
    throw error;
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Configuration Boundary Intercepted:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 m-4 border border-red-800 bg-red-950/20 text-red-400 rounded-lg">
          <h3>⚠️ Configuration Error</h3>
          <p className="text-sm font-mono mt-1">{this.state.errorMessage}</p>
        </div>
      );
    }

    // Fixed: Properly accessing children via this.props
    return this.props.children;
  }
}