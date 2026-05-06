import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TotpService } from '../services/totp.service';
import { authenticator } from 'otplib';

describe('TotpService', () => {
  let service: TotpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TotpService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              if (key === 'TOTP_ISSUER') return 'StellarEarnTest';
              return defaultVal;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TotpService>(TotpService);
  });

  describe('generateSetup', () => {
    it('returns a secret, otpauthUrl, and qrCodeDataUrl', async () => {
      const result = await service.generateSetup('GABC123');

      expect(result.secret).toBeTruthy();
      expect(result.secret.length).toBeGreaterThanOrEqual(16);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.otpauthUrl).toContain('StellarEarnTest');
      expect(result.otpauthUrl).toContain('GABC123');
      expect(result.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('generates a unique secret each call', async () => {
      const r1 = await service.generateSetup('GABC123');
      const r2 = await service.generateSetup('GABC123');
      expect(r1.secret).not.toBe(r2.secret);
    });
  });

  describe('verifyToken', () => {
    it('returns true for a valid current TOTP token', async () => {
      const { secret } = await service.generateSetup('GABC123');
      const validToken = authenticator.generate(secret);
      expect(service.verifyToken(secret, validToken)).toBe(true);
    });

    it('returns false for an incorrect token', async () => {
      const { secret } = await service.generateSetup('GABC123');
      expect(service.verifyToken(secret, '000000')).toBe(false);
    });

    it('returns false for a token from a different secret', async () => {
      const { secret: secret1 } = await service.generateSetup('GABC123');
      const { secret: secret2 } = await service.generateSetup('GABC456');
      const tokenForSecret2 = authenticator.generate(secret2);
      expect(service.verifyToken(secret1, tokenForSecret2)).toBe(false);
    });

    it('returns false for a malformed token', () => {
      expect(service.verifyToken('JBSWY3DPEHPK3PXP', 'abc')).toBe(false);
    });
  });

  describe('generateToken', () => {
    it('generates a 6-digit numeric token', async () => {
      const { secret } = await service.generateSetup('GABC123');
      const token = service.generateToken(secret);
      expect(token).toMatch(/^\d{6}$/);
    });

    it('generates a token that passes verifyToken', async () => {
      const { secret } = await service.generateSetup('GABC123');
      const token = service.generateToken(secret);
      expect(service.verifyToken(secret, token)).toBe(true);
    });
  });
});
