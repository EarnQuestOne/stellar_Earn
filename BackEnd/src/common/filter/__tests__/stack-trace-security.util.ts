/**
 * Security utility to assert that error responses do not leak stack traces
 * or sensitive server information. Used in all error handling tests.
 */

export interface StackTraceLeakageResult {
  isLeaking: boolean;
  leakages: string[];
  details: {
    foundStackFrames: boolean;
    foundFilePaths: boolean;
    foundNodeModules: boolean;
    foundORMNames: boolean;
    foundServerPaths: boolean;
  };
}

/**
 * Primary assertion function: checks response body for stack trace leakage
 * Must be called on every error response in production mode tests
 */
export function assertNoStackLeakage(responseBody: unknown): StackTraceLeakageResult {
  const bodyStr = JSON.stringify(responseBody);
  const leakages: string[] = [];
  
  // Pattern 1: Stack frame lines (e.g., "at Object.<anonymous> (/app/src/main.ts:123:45)")
  const stackFramePattern = /at\s+[\w\s.]+\s+\(.*?:\d+:\d+\)/g;
  if (stackFramePattern.test(bodyStr)) {
    leakages.push('Found stack frame pattern: ' + bodyStr.match(stackFramePattern)?.[0]);
  }

  // Pattern 2: File paths with line numbers (e.g., "/app/src/handlers/error.ts:42:15")
  const filePathPattern = /[\\/][\w\/-]+\.(ts|js):\d+:\d+/g;
  if (filePathPattern.test(bodyStr)) {
    leakages.push('Found file path pattern: ' + bodyStr.match(filePathPattern)?.[0]);
  }

  // Pattern 3: Common server paths
  const serverPathPatterns = [
    /\/app\//g,
    /\/home\//g,
    /\/usr\/local\//g,
    /\/usr\/app\//g,
    /C:\\Users\\/g,
    /C:\\app\\/g,
  ];
  
  serverPathPatterns.forEach((pattern) => {
    if (pattern.test(bodyStr)) {
      leakages.push('Found server path: ' + bodyStr.match(pattern)?.[0]);
    }
  });

  // Pattern 4: node_modules references (common ORM/framework internals)
  if (/node_modules/g.test(bodyStr)) {
    leakages.push('Found node_modules reference');
  }

  // Pattern 5: ORM/framework internals that indicate stack trace content
  const ormPatterns = [
    /prisma/gi,
    /typeorm/gi,
    /sequelize/gi,
    /sqlalchemy/gi,
  ];
  
  ormPatterns.forEach((pattern) => {
    if (pattern.test(bodyStr)) {
      leakages.push('Found ORM internals: ' + bodyStr.match(pattern)?.[0]);
    }
  });

  // Pattern 6: Database query patterns (CRITICAL - should never appear in responses)
  if (/SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER/gi.test(bodyStr)) {
    // Allow these only if they appear in clear database-specific fields that are expected
    const dbQueryFields = ['query', 'sql', 'statement'];
    const hasDbField = dbQueryFields.some((field) =>
      new RegExp(`"${field}"\\s*:\\s*"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)`, 'gi').test(bodyStr)
    );
    if (hasDbField) {
      leakages.push('Found database query patterns in response');
    }
  }

  return {
    isLeaking: leakages.length > 0,
    leakages,
    details: {
      foundStackFrames: /at\s+[\w\s.]+\s+\(/.test(bodyStr),
      foundFilePaths: /\.(?:ts|js):\d+:\d+/.test(bodyStr),
      foundNodeModules: /node_modules/.test(bodyStr),
      foundORMNames: /(?:prisma|typeorm|sequelize|sqlalchemy)/gi.test(bodyStr),
      foundServerPaths: /(?:\/app\/|\/home\/|\/usr\/|C:\\Users\\|C:\\app\\)/.test(bodyStr),
    },
  };
}

/**
 * Validate error response conforms to safe contract
 */
export interface SafeErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  requestId?: string;
  timestamp?: string;
  stack?: unknown; // Only in development
  debug?: Record<string, unknown>; // Only in development/non-operational
}

export function assertSafeErrorContract(
  responseBody: unknown,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const body = responseBody as Record<string, unknown>;

  if (!Number.isInteger(body.statusCode)) {
    errors.push('Missing or invalid statusCode');
  }

  if (typeof body.error !== 'string') {
    errors.push('Missing or invalid error field');
  }

  if (typeof body.message !== 'string') {
    errors.push('Missing or invalid message field');
  }

  if (body.requestId && typeof body.requestId !== 'string') {
    errors.push('Invalid requestId format');
  }

  if (body.stack !== undefined) {
    errors.push(
      'Stack field must not be present in production or should only be in development',
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper: check if response is for a known operational error (4xx)
 */
export function isOperationalError(statusCode: number): boolean {
  return statusCode >= 400 && statusCode < 500;
}

/**
 * Helper: ensure message does not contain raw error details
 */
export function assertGenericMessage(
  message: string,
  statusCode: number,
): { isGeneric: boolean; reason?: string } {
  const internalPatterns = [
    /prisma/gi,
    /typeorm/gi,
    /database/gi,
    /query/gi,
    /constraint/gi,
    /foreign\s+key/gi,
    /unique\s+violation/gi,
    /table.*does.*not.*exist/gi,
    /column.*does.*not.*exist/gi,
  ];

  for (const pattern of internalPatterns) {
    if (pattern.test(message)) {
      return {
        isGeneric: false,
        reason: `Message contains internal detail pattern: ${pattern}`,
      };
    }
  }

  // For 5xx errors, message should be "An unexpected error occurred" in production
  if (statusCode >= 500 && message !== 'An unexpected error occurred') {
    return {
      isGeneric: false,
      reason: `5xx error message should be generic, got: "${message}"`,
    };
  }

  return { isGeneric: true };
}
