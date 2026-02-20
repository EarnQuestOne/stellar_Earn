import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

/**
 * Security middleware for additional request validation and sanitization
 * Provides enhanced security beyond Helmet and basic validation
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    // Log security-relevant information
    this.logRequestInfo(req);

    // Additional security headers
    this.setAdditionalSecurityHeaders(res);

    // Request validation
    this.validateRequest(req);

    // Sanitize query parameters
    this.sanitizeQueryParams(req);

    // Detect suspicious patterns
    this.detectSuspiciousActivity(req);

    next();
  }

  private logRequestInfo(req: Request): void {
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ipAddress = this.getClientIP(req);
    const method = req.method;
    const url = req.url;
    const referer = req.get('Referer') || 'Direct';

    this.logger.verbose(
      `Request: ${method} ${url} | IP: ${ipAddress} | UA: ${userAgent.substring(0, 50)}... | Ref: ${referer}`,
    );
  }

  private setAdditionalSecurityHeaders(res: Response): void {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Enable XSS protection (for older browsers)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Specify referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server information
    res.removeHeader('X-Powered-By');

    // Set strict transport security (if not set by Helmet)
    if (!res.getHeader('Strict-Transport-Security')) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }
  }

  private validateRequest(req: Request): void {
    // Validate Content-Type for POST/PUT/PATCH requests
    const writeMethods = ['POST', 'PUT', 'PATCH'];
    if (
      writeMethods.includes(req.method) &&
      req.headers['content-type'] &&
      !req.headers['content-type'].includes('application/json') &&
      !req.headers['content-type'].includes('application/x-www-form-urlencoded')
    ) {
      this.logger.warn(
        `Suspicious Content-Type: ${req.headers['content-type']} for ${req.method} request to ${req.url}`,
      );
    }

    // Check for excessive headers (potential attack)
    const headerCount = Object.keys(req.headers).length;
    if (headerCount > 100) {
      this.logger.warn(
        `Excessive headers (${headerCount}) in request to ${req.url}`,
      );
    }

    // Validate user agent
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
      this.logger.verbose(
        `Suspicious User-Agent: ${userAgent || 'None'} for request to ${req.url}`,
      );
    }
  }

  private sanitizeQueryParams(req: Request): void {
    // Deep sanitize query parameters
    if (req.query) {
      req.query = this.sanitizeObject(req.query);
    }
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Remove dangerous keys
        if (
          key.toLowerCase().includes('constructor') ||
          key.toLowerCase().includes('prototype') ||
          key.toLowerCase().includes('__proto__')
        ) {
          continue;
        }
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    return (
      str
        // Remove NULL bytes
        .replace(/\0/g, '')
        // Remove control characters
        .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
        // Basic HTML entity decoding to prevent double-encoding attacks
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        // Remove javascript protocol
        .replace(/javascript:/gi, 'javascript_disabled:')
        // Remove data protocol (except for data:image)
        .replace(/((?!data:image\/)\S)*data:(?!image\/)\S*/gi, 'data_disabled:')
        .trim()
    );
  }

  private detectSuspiciousActivity(req: Request): void {
    const url = req.url;
    const method = req.method;
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';

    // Check for common attack patterns
    const attackPatterns = [
      /\b(?:SELECT|UNION|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|xp_)\b/i,
      /\.\.\/|~\/|\/\/\/|\/\.\./,
      /<script.*?>|<.*?onload|<.*?onerror|<img.*?onerror/i,
      /\$\{.*?\}|#\{.*?\}|{{.*?}}/,
      /etc\/passwd|c:|windows\/|\/system32\//i,
    ];

    // Check URL parameters
    const suspiciousInput = url + JSON.stringify(req.query) + JSON.stringify(req.body);
    const detectedAttack = attackPatterns.find(pattern => pattern.test(suspiciousInput));

    if (detectedAttack) {
      this.logger.warn(
        `Suspicious input detected: ${detectedAttack.toString()} | ${method} ${url} | IP: ${this.getClientIP(req)} | UA: ${userAgent.substring(0, 50)}`,
      );

      // In production, you might want to block these requests
      // For now, we just log them
    }

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /zaproxy/i,
    ];

    const suspiciousUA = suspiciousUserAgents.find(pattern => pattern.test(userAgent));
    if (suspiciousUA) {
      this.logger.warn(
        `Suspicious User-Agent detected: ${userAgent} | ${method} ${url}`,
      );
    }
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      (req.connection?.remoteAddress as string) ||
      (req.socket?.remoteAddress as string) ||
      'Unknown'
    );
  }
}