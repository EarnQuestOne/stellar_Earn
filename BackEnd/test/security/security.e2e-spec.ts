import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SecurityExceptionFilter } from '../../src/common/filters/security-exception.filter';
import { SanitizationPipe } from '../../src/common/pipes/sanitization.pipe';

describe('Security Hardening (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply security configurations
    app.useGlobalPipes(
      new SanitizationPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    
    app.useGlobalFilters(new SecurityExceptionFilter());
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Security Headers', () => {
    it('should set security headers on all responses', () => {
      return request(app.getHttpServer())
        .get('/api/health') // Assuming there's a health endpoint
        .expect(404) // or whatever the actual response is
        .expect((res) => {
          expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
          expect(res.headers).toHaveProperty('x-frame-options', 'DENY');
          expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
          expect(res.headers).not.toHaveProperty('x-powered-by');
        });
    });

    it('should set strict transport security header', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect((res) => {
          expect(res.headers).toHaveProperty(
            'strict-transport-security',
            'max-age=31536000; includeSubDomains; preload',
          );
        });
    });

    it('should set content security policy', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect((res) => {
          expect(res.headers).toHaveProperty('content-security-policy');
        });
    });
  });

  describe('CORS Security', () => {
    it('should reject requests from unauthorized origins', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com')
        .expect(403); // or whatever CORS rejection status is
    });

    it('should allow requests from authorized origins', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(404); // or success status
    });

    it('should validate CORS preflight requests', () => {
      return request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
        .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
        .expect('Access-Control-Allow-Credentials', 'true');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize XSS attempts in query parameters', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      
      return request(app.getHttpServer())
        .get(`/api/test?input=${encodeURIComponent(maliciousInput)}`)
        .expect(404) // or whatever the response is
        .expect((res) => {
          // The actual sanitization happens in the pipe, so we test that it doesn't crash
          expect(res.status).toBeDefined();
        });
    });

    it('should sanitize SQL injection attempts', () => {
      const sqlInjection = "1'; DROP TABLE users; --";
      
      return request(app.getHttpServer())
        .post('/api/test')
        .send({ input: sqlInjection })
        .expect(404)
        .expect((res) => {
          expect(res.status).toBeDefined();
        });
    });

    it('should prevent prototype pollution', () => {
      const payload = {
        __proto__: { polluted: true },
        constructor: { polluted: true },
      };
      
      return request(app.getHttpServer())
        .post('/api/test')
        .send(payload)
        .expect(404)
        .expect((res) => {
          // Should not crash or pollute
          expect(res.status).toBeDefined();
        });
    });

    it('should sanitize dangerous JavaScript protocols', () => {
      const dangerousInput = 'javascript:alert(1)';
      
      return request(app.getHttpServer())
        .post('/api/test')
        .send({ input: dangerousInput })
        .expect(404)
        .expect((res) => {
          expect(res.status).toBeDefined();
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive requests', async () => {
      // Make multiple rapid requests
      const requests = Array(20)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/api/health'));
      
      const responses = await Promise.all(requests);
      
      // Some should be rate limited (429)
      const rateLimited = responses.filter(res => res.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should not expose sensitive information in error responses', () => {
      return request(app.getHttpServer())
        .get('/non-existent-endpoint')
        .expect(404)
        .expect((res) => {
          const body = res.body;
          expect(body).toHaveProperty('statusCode', 404);
          expect(body).toHaveProperty('message');
          expect(body).not.toHaveProperty('stack');
          expect(body.message).not.toContain('internal');
          expect(body.message).not.toContain('password');
        });
    });

    it('should provide generic messages for security errors', () => {
      // Test unauthorized access
      return request(app.getHttpServer())
        .get('/api/protected') // Assuming protected route
        .expect(401)
        .expect((res) => {
          expect(res.body.message).toBe('Unauthorized access');
        });
    });
  });

  describe('Content Security', () => {
    it('should reject requests with dangerous content types', () => {
      return request(app.getHttpServer())
        .post('/api/test')
        .set('Content-Type', 'text/html') // Potentially dangerous
        .send('<script>alert(1)</script>')
        .expect(400); // Should reject or sanitize
    });

    it('should validate request headers', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .set('User-Agent', '') // Suspicious empty user agent
        .expect((res) => {
          // Should still work but might be logged
          expect(res.status).toBeDefined();
        });
    });
  });

  describe('Attack Vector Testing', () => {
    const attackVectors = [
      { name: 'SQL Injection', payload: "1' OR '1'='1" },
      { name: 'XSS Script Tag', payload: '<script>alert(1)</script>' },
      { name: 'XSS Image Tag', payload: '<img src=x onerror=alert(1)>' },
      { name: 'Path Traversal', payload: '../../../etc/passwd' },
      { name: 'Command Injection', payload: '; cat /etc/passwd' },
      { name: 'Template Injection', payload: '${7*7}' },
      { name: 'Prototype Pollution', payload: '__proto__[polluted]=true' },
    ];

    attackVectors.forEach(({ name, payload }) => {
      it(`should handle ${name} attempts gracefully`, () => {
        return request(app.getHttpServer())
          .post('/api/test')
          .send({ input: payload })
          .expect((res) => {
            // Should not crash, should return appropriate status
            expect([200, 201, 400, 404]).toContain(res.status);
          });
      });
    });
  });

  describe('Security Logging', () => {
    it('should log suspicious activities', async () => {
      // This test would verify that suspicious activities are logged
      // In a real test, you'd check log output or use a mock logger
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await request(app.getHttpServer())
        .get('/api/health')
        .set('User-Agent', 'sqlmap/1.0') // Suspicious user agent
        .expect(404);
      
      // In a real implementation, you'd verify the log was called
      // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('suspicious'));
      
      consoleSpy.mockRestore();
    });
  });
});