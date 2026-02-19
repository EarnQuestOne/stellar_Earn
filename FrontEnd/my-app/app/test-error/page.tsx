'use client';

import { useState } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorMessage } from '@/components/error/ErrorMessage';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

// Component that throws an error to test error boundary
function BadComponent() {
  const [shouldError, setShouldError] = useState(false);
  
  if (shouldError) {
    throw new Error('This is a test error!');
  }
  
  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-white font-medium mb-4">Test Component</h3>
      <button
        onClick={() => setShouldError(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
      >
        Trigger Error
      </button>
    </div>
  );
}

// Component that uses the error handler hook
function TestWithErrorHandler() {
  const { error, handleError, clearError, errorMessage } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  const simulateNetworkError = async () => {
    setLoading(true);
    try {
      // Simulate API call that fails
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network request failed')), 1000);
      });
    } catch (err) {
      handleError(err as Error, 'Network test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-zinc-800 rounded-lg">
      <h3 className="text-white font-medium mb-4">Error Handler Test</h3>
      
      {error && (
        <ErrorMessage
          error={error}
          title="Network Error"
          message={errorMessage}
          onRetry={clearError}
          showRetry={true}
        />
      )}
      
      <div className="flex gap-3">
        <button
          onClick={simulateNetworkError}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Simulate Error'}
        </button>
        
        <button
          onClick={clearError}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
        >
          Clear Error
        </button>
      </div>
    </div>
  );
}

// Main test page
export default function ErrorHandlingTest() {
  return (
    <div className="min-h-screen bg-zinc-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Error Handling Test</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ErrorBoundary>
            <BadComponent />
          </ErrorBoundary>
          
          <TestWithErrorHandler />
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-medium text-white mb-4">Test Navigation</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.location.href = '/nonexistent-page'}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
            >
              Test 404 Page
            </button>
            
            <button
              onClick={() => window.location.href = '/500'}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Test 500 Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}