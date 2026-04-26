import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { TwoFactorService } from '../services/two-factor.service';
import { TotpService } from '../services/totp.service';
import { TwoFactorAuth } from '../entities/two-factor.entity';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const STELLAR_ADDRESS = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const MOCK_SECRET = 'JBSWY3DPEHPK3PXP';
const VALID_CODE = '123456';

function makeMockRecord(overrides: Partial<TwoFactorAuth> = {}): TwoFactorAuth {
  return {
    id: 'uuid-1',
    stellarAddress: STELLAR_ADDRESS,
    secret: MOCK_SECRET,
    enabled: false,
    lastVerifiedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as TwoFactorAuth;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let totpService: jest.Mocked<TotpService>;

  const mockRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        {
          provide: TotpService,
          useValue: {
            generateSetup: jest.fn(),
            verifyToken: jest.fn(),
            generateToken: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TwoFactorAuth),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<TwoFactorService>(TwoFactorService);
    totpService = module.get(TotpService);

    // Default query builder mock (returns null)
    mockRepo.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    });
  });

  afterEach(() => jest.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // initiate2faSetup
  // ─────────────────────────────────────────────────────────────────────────

  describe('initiate2faSetup', () => {
    it('creates a new pending record when none exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue(makeMockRecord());
      mockRepo.save.mockResolvedValue(makeMockRecord());
      totpService.generateSetup.mockResolvedValue({
        secret: MOCK_SECRET,
        otpauthUrl: 'otpauth://totp/...',
        qrCodeDataUrl: 'data:image/png;base64,...',
      });

      const result = await service.initiate2faSetup(STELLAR_ADDRESS);

      expect(result.secret).toBe(MOCK_SECRET);
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(result.qrCodeDataUrl).toContain('data:image/png');
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ stellarAddress: STELLAR_ADDRESS, enabled: false }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('overwrites a pending (unconfirmed) record', async () => {
      const pending = makeMockRecord({ enabled: false });
      mockRepo.findOne.mockResolvedValue(pending);
      mockRepo.save.mockResolvedValue(pending);
      totpService.generateSetup.mockResolvedValue({
        secret: 'NEWSECRET',
        otpauthUrl: 'otpauth://totp/...',
        qrCodeDataUrl: 'data:image/png;base64,...',
      });

      await service.initiate2faSetup(STELLAR_ADDRESS);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ secret: 'NEWSECRET', enabled: false }),
      );
    });

    it('throws ConflictException when 2FA is already enabled', async () => {
      mockRepo.findOne.mockResolvedValue(makeMockRecord({ enabled: true }));

      await expect(service.initiate2faSetup(STELLAR_ADDRESS)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // confirm2faSetup
  // ─────────────────────────────────────────────────────────────────────────

  describe('confirm2faSetup', () => {
    it('enables 2FA when TOTP code is valid', async () => {
      const record = makeMockRecord({ enabled: false });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      mockRepo.save.mockResolvedValue({ ...record, enabled: true });
      totpService.verifyToken.mockReturnValue(true);

      await service.confirm2faSetup(STELLAR_ADDRESS, VALID_CODE);

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true }),
      );
    });

    it('throws UnauthorizedException when TOTP code is invalid', async () => {
      const record = makeMockRecord({ enabled: false });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      totpService.verifyToken.mockReturnValue(false);

      await expect(
        service.confirm2faSetup(STELLAR_ADDRESS, '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when setup was not initiated', async () => {
      // getOne returns null
      await expect(
        service.confirm2faSetup(STELLAR_ADDRESS, VALID_CODE),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when 2FA is already enabled', async () => {
      const record = makeMockRecord({ enabled: true });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });

      await expect(
        service.confirm2faSetup(STELLAR_ADDRESS, VALID_CODE),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // disable2fa
  // ─────────────────────────────────────────────────────────────────────────

  describe('disable2fa', () => {
    it('removes the record when TOTP code is valid', async () => {
      const record = makeMockRecord({ enabled: true });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      mockRepo.remove.mockResolvedValue(record);
      totpService.verifyToken.mockReturnValue(true);

      await service.disable2fa(STELLAR_ADDRESS, VALID_CODE);

      expect(mockRepo.remove).toHaveBeenCalledWith(record);
    });

    it('throws UnauthorizedException when TOTP code is invalid', async () => {
      const record = makeMockRecord({ enabled: true });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      totpService.verifyToken.mockReturnValue(false);

      await expect(
        service.disable2fa(STELLAR_ADDRESS, '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws BadRequestException when 2FA is not enabled', async () => {
      // No record exists
      await expect(
        service.disable2fa(STELLAR_ADDRESS, VALID_CODE),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // verifyLoginCode
  // ─────────────────────────────────────────────────────────────────────────

  describe('verifyLoginCode', () => {
    it('passes silently when 2FA is not enabled', async () => {
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.verifyLoginCode(STELLAR_ADDRESS, VALID_CODE),
      ).resolves.toBeUndefined();
    });

    it('passes when TOTP code is valid', async () => {
      const record = makeMockRecord({ enabled: true });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      mockRepo.save.mockResolvedValue(record);
      totpService.verifyToken.mockReturnValue(true);

      await expect(
        service.verifyLoginCode(STELLAR_ADDRESS, VALID_CODE),
      ).resolves.toBeUndefined();
    });

    it('throws UnauthorizedException when TOTP code is invalid', async () => {
      const record = makeMockRecord({ enabled: true });
      mockRepo.createQueryBuilder.mockReturnValue({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(record),
      });
      totpService.verifyToken.mockReturnValue(false);

      await expect(
        service.verifyLoginCode(STELLAR_ADDRESS, '000000'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // is2faEnabled / get2faStatus
  // ─────────────────────────────────────────────────────────────────────────

  describe('is2faEnabled', () => {
    it('returns true when 2FA is enabled', async () => {
      mockRepo.findOne.mockResolvedValue(makeMockRecord({ enabled: true }));
      expect(await service.is2faEnabled(STELLAR_ADDRESS)).toBe(true);
    });

    it('returns false when no record exists', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      expect(await service.is2faEnabled(STELLAR_ADDRESS)).toBe(false);
    });

    it('returns false when record exists but not yet confirmed', async () => {
      mockRepo.findOne.mockResolvedValue(makeMockRecord({ enabled: false }));
      expect(await service.is2faEnabled(STELLAR_ADDRESS)).toBe(false);
    });
  });

  describe('get2faStatus', () => {
    it('returns { enabled: true } when 2FA is active', async () => {
      mockRepo.findOne.mockResolvedValue(makeMockRecord({ enabled: true }));
      const status = await service.get2faStatus(STELLAR_ADDRESS);
      expect(status).toEqual({ enabled: true });
    });

    it('returns { enabled: false } when 2FA is inactive', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const status = await service.get2faStatus(STELLAR_ADDRESS);
      expect(status).toEqual({ enabled: false });
    });
  });
});
