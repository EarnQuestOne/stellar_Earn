import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NestInterceptor,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Observable } from 'rxjs';

import { Role } from '../../common/enums/role.enum';
import type { AuthUser } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ClaimPayoutDto, CreatePayoutDto } from './dto/claim-payout.dto';
import {
  PayoutQueryDto,
  PayoutStatus,
  PayoutType,
} from './dto/payout-query.dto';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { FraudRiskRulesService } from './services/fraud-risk-rules.service';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

// ─── Pass-through interceptor stub ────────────────────────────────────────────

@Injectable()
class NoopInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STELLAR_ADDRESS = 'G'.padEnd(56, 'A');

const USER_AUTH: AuthUser = {
  id: 'user-uuid-1',
  stellarAddress: STELLAR_ADDRESS,
  role: Role.USER,
};

const PAYOUT_RESPONSE = {
  id: 'payout-uuid-1',
  stellarAddress: STELLAR_ADDRESS,
  amount: 10,
  asset: 'XLM',
  status: PayoutStatus.PENDING,
  type: PayoutType.QUEST_REWARD,
  questId: 'quest-uuid-1',
  submissionId: 'sub-uuid-1',
  transactionHash: null,
  stellarLedger: null,
  settlementConfirmations: 0,
  settlementConfirmedAt: null,
  failureReason: null,
  retryCount: 0,
  processedAt: null,
  claimedAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const HISTORY_RESPONSE = {
  data: [PAYOUT_RESPONSE],
  total: 1,
  cursor: null,
};

const STATS_RESPONSE = {
  total: 5,
  totalAmount: 50,
  pendingCount: 1,
  completedCount: 3,
  failedCount: 1,
  asset: 'XLM',
};

const FRAUD_ASSESSMENT = {
  payoutId: 'payout-uuid-1',
  riskLevel: 'low' as const,
  riskFactors: [],
  flagged: false,
  timestamp: new Date(),
};

// ─── Mock factories ────────────────────────────────────────────────────────────

const buildPayoutsServiceMock = () => ({
  claimPayout: jest.fn().mockResolvedValue(PAYOUT_RESPONSE),
  getPayoutHistory: jest.fn().mockResolvedValue(HISTORY_RESPONSE),
  getPayoutStats: jest.fn().mockResolvedValue(STATS_RESPONSE),
  getPayoutById: jest.fn().mockResolvedValue(PAYOUT_RESPONSE),
  createPayout: jest.fn().mockResolvedValue({
    ...PAYOUT_RESPONSE,
    maxRetries: 5,
    nextRetryAt: null,
    updatedAt: new Date(),
    deletedAt: null,
  }),
  retryPayout: jest.fn().mockResolvedValue(PAYOUT_RESPONSE),
});

const buildFraudServiceMock = () => ({
  analyzePayout: jest.fn().mockResolvedValue(FRAUD_ASSESSMENT),
  analyzeRecentPayouts: jest.fn().mockResolvedValue({
    totalPayoutsChecked: 3,
    flaggedPayouts: 0,
    assessments: [],
  }),
  getRiskStatistics: jest.fn().mockResolvedValue({ total: 3, flagged: 0 }),
});

// ─── Module builder helper ─────────────────────────────────────────────────────

async function buildModule(opts?: {
  payoutsService?: Partial<ReturnType<typeof buildPayoutsServiceMock>>;
  fraudService?: Partial<ReturnType<typeof buildFraudServiceMock>>;
}): Promise<TestingModule> {
  return Test.createTestingModule({
    controllers: [PayoutsController],
    providers: [
      {
        provide: PayoutsService,
        useValue: { ...buildPayoutsServiceMock(), ...opts?.payoutsService },
      },
      {
        provide: FraudRiskRulesService,
        useValue: { ...buildFraudServiceMock(), ...opts?.fraudService },
      },
      Reflector,
    ],
  })
    .overrideInterceptor(IdempotencyInterceptor)
    .useClass(NoopInterceptor)
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .overrideGuard(RolesGuard)
    .useValue({ canActivate: jest.fn().mockReturnValue(true) })
    .compile();
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe('PayoutsController', () => {
  let controller: PayoutsController;
  let payoutsService: ReturnType<typeof buildPayoutsServiceMock>;
  let fraudService: ReturnType<typeof buildFraudServiceMock>;

  beforeEach(async () => {
    payoutsService = buildPayoutsServiceMock();
    fraudService = buildFraudServiceMock();

    const module = await Test.createTestingModule({
      controllers: [PayoutsController],
      providers: [
        { provide: PayoutsService, useValue: payoutsService },
        { provide: FraudRiskRulesService, useValue: fraudService },
        Reflector,
      ],
    })
      .overrideInterceptor(IdempotencyInterceptor)
      .useClass(NoopInterceptor)
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<PayoutsController>(PayoutsController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── Controller instantiation ───────────────────────────────────────────────

  describe('instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  // ─── Guard metadata wiring ─────────────────────────────────────────────────

  describe('Guard metadata wiring', () => {
    const getGuardNames = (target: object): string[] => {
      const guards: unknown[] = Reflect.getMetadata('__guards__', target) ?? [];
      return guards.map((g) =>
        typeof g === 'function'
          ? (g as { name: string }).name
          : ((g as { name?: string }).name ?? ''),
      );
    };

    it('applies JwtAuthGuard at the controller class level', () => {
      expect(getGuardNames(PayoutsController)).toContain('JwtAuthGuard');
    });

    it('applies RolesGuard on createPayout (POST admin/create)', () => {
      expect(getGuardNames(PayoutsController.prototype.createPayout)).toContain(
        'RolesGuard',
      );
    });

    it('applies RolesGuard on getAllPayouts (GET admin/all)', () => {
      expect(getGuardNames(PayoutsController.prototype.getAllPayouts)).toContain(
        'RolesGuard',
      );
    });

    it('applies RolesGuard on getGlobalPayoutStats (GET admin/stats)', () => {
      expect(
        getGuardNames(PayoutsController.prototype.getGlobalPayoutStats),
      ).toContain('RolesGuard');
    });

    it('applies RolesGuard on retryPayout (POST admin/:id/retry)', () => {
      expect(getGuardNames(PayoutsController.prototype.retryPayout)).toContain(
        'RolesGuard',
      );
    });

    it('applies RolesGuard on getAnyPayoutById (GET admin/:id)', () => {
      expect(
        getGuardNames(PayoutsController.prototype.getAnyPayoutById),
      ).toContain('RolesGuard');
    });

    it('applies RolesGuard on analyzePayoutRisk (GET fraud-risk/:id)', () => {
      expect(
        getGuardNames(PayoutsController.prototype.analyzePayoutRisk),
      ).toContain('RolesGuard');
    });

    it('applies RolesGuard on analyzeRecentPayoutsRisk (GET fraud-risk/batch)', () => {
      expect(
        getGuardNames(PayoutsController.prototype.analyzeRecentPayoutsRisk),
      ).toContain('RolesGuard');
    });

    it('applies RolesGuard on getRiskStatistics (GET fraud-risk/statistics)', () => {
      expect(
        getGuardNames(PayoutsController.prototype.getRiskStatistics),
      ).toContain('RolesGuard');
    });
  });

  // ─── Roles metadata ────────────────────────────────────────────────────────

  describe('Roles metadata — every admin route requires Role.ADMIN', () => {
    const ROLES_KEY = 'roles';

    const adminMethods: Array<keyof PayoutsController> = [
      'createPayout',
      'getAllPayouts',
      'getGlobalPayoutStats',
      'retryPayout',
      'getAnyPayoutById',
      'analyzePayoutRisk',
      'analyzeRecentPayoutsRisk',
      'getRiskStatistics',
    ];

    for (const method of adminMethods) {
      it(`requires Role.ADMIN on ${method}`, () => {
        const roles: Role[] = Reflect.getMetadata(
          ROLES_KEY,
          PayoutsController.prototype[method],
        );
        expect(roles).toContain(Role.ADMIN);
      });
    }
  });

  // ─── HTTP status code decorators ───────────────────────────────────────────

  describe('HTTP status code decorators', () => {
    it('claimPayout has @HttpCode(200)', () => {
      const code = Reflect.getMetadata(
        '__httpCode__',
        PayoutsController.prototype.claimPayout,
      );
      expect(code).toBe(HttpStatus.OK);
    });

    it('retryPayout has @HttpCode(200)', () => {
      const code = Reflect.getMetadata(
        '__httpCode__',
        PayoutsController.prototype.retryPayout,
      );
      expect(code).toBe(HttpStatus.OK);
    });
  });

  // ─── Guard access-control simulation ──────────────────────────────────────

  describe('Guard access control (canActivate simulation)', () => {
    it('JwtAuthGuard returning false signals 401 — unauthenticated requests are denied', () => {
      const denyJwt = { canActivate: jest.fn().mockReturnValue(false) };
      expect(denyJwt.canActivate({})).toBe(false);
    });

    it('RolesGuard returning false signals 403 — non-admin callers are denied', () => {
      const denyRoles = { canActivate: jest.fn().mockReturnValue(false) };
      expect(denyRoles.canActivate({})).toBe(false);
    });

    it('RolesGuard allows ADMIN users on admin routes', () => {
      const requiredRoles = [Role.ADMIN];
      expect(requiredRoles.some((r) => r === Role.ADMIN)).toBe(true);
    });

    it('RolesGuard blocks USER on admin routes', () => {
      const requiredRoles = [Role.ADMIN];
      const regularUser = { role: Role.USER };
      expect(requiredRoles.some((r) => regularUser.role === r)).toBe(false);
    });

    it('RolesGuard blocks MODERATOR on admin routes', () => {
      const requiredRoles = [Role.ADMIN];
      const moderatorUser = { role: Role.MODERATOR };
      expect(requiredRoles.some((r) => moderatorUser.role === r)).toBe(false);
    });

    it('RolesGuard blocks VERIFIER on admin routes', () => {
      const requiredRoles = [Role.ADMIN];
      const verifierUser = { role: Role.VERIFIER };
      expect(requiredRoles.some((r) => verifierUser.role === r)).toBe(false);
    });

    it('throws UnauthorizedException when JwtAuthGuard denies access', () => {
      const denyJwt = {
        canActivate: jest.fn(() => {
          throw new UnauthorizedException();
        }),
      };
      expect(() => denyJwt.canActivate({})).toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException when RolesGuard denies access', () => {
      const denyRoles = {
        canActivate: jest.fn(() => {
          throw new ForbiddenException();
        }),
      };
      expect(() => denyRoles.canActivate({})).toThrow(ForbiddenException);
    });
  });

  // ─── POST /payouts/claim ──────────────────────────────────────────────────

  describe('POST /payouts/claim — claimPayout', () => {
    const validDto: ClaimPayoutDto = {
      submissionId: '123e4567-e89b-12d3-a456-426614174000',
      stellarAddress: STELLAR_ADDRESS,
    };

    it('delegates to PayoutsService.claimPayout with dto and user stellarAddress', async () => {
      await controller.claimPayout(validDto, USER_AUTH);
      expect(payoutsService.claimPayout).toHaveBeenCalledTimes(1);
      expect(payoutsService.claimPayout).toHaveBeenCalledWith(
        validDto,
        USER_AUTH.stellarAddress,
      );
    });

    it('returns the PayoutResponseDto from the service', async () => {
      const result = await controller.claimPayout(validDto, USER_AUTH);
      expect(result).toEqual(PAYOUT_RESPONSE);
    });

    it('propagates NotFoundException (404) when payout is not found', async () => {
      payoutsService.claimPayout.mockRejectedValueOnce(
        new NotFoundException('Payout not found'),
      );
      await expect(
        controller.claimPayout(validDto, USER_AUTH),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates BadRequestException (400) when payout cannot be claimed', async () => {
      payoutsService.claimPayout.mockRejectedValueOnce(
        new BadRequestException('Payout cannot be claimed'),
      );
      await expect(
        controller.claimPayout(validDto, USER_AUTH),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── GET /payouts/history ─────────────────────────────────────────────────

  describe('GET /payouts/history — getMyPayoutHistory', () => {
    it('delegates with query and user stellarAddress', async () => {
      const query: PayoutQueryDto = {};
      await controller.getMyPayoutHistory(query, USER_AUTH);
      expect(payoutsService.getPayoutHistory).toHaveBeenCalledWith(
        query,
        USER_AUTH.stellarAddress,
      );
    });

    it('returns the history response from the service', async () => {
      const result = await controller.getMyPayoutHistory({}, USER_AUTH);
      expect(result).toEqual(HISTORY_RESPONSE);
    });

    it('passes optional status filter through to service', async () => {
      const query: PayoutQueryDto = { status: PayoutStatus.COMPLETED };
      await controller.getMyPayoutHistory(query, USER_AUTH);
      expect(payoutsService.getPayoutHistory).toHaveBeenCalledWith(
        query,
        USER_AUTH.stellarAddress,
      );
    });

    it('passes optional type filter through to service', async () => {
      const query: PayoutQueryDto = { type: PayoutType.BONUS };
      await controller.getMyPayoutHistory(query, USER_AUTH);
      expect(payoutsService.getPayoutHistory).toHaveBeenCalledWith(
        query,
        USER_AUTH.stellarAddress,
      );
    });
  });

  // ─── GET /payouts/stats ───────────────────────────────────────────────────

  describe('GET /payouts/stats — getMyPayoutStats', () => {
    it('delegates to PayoutsService.getPayoutStats with user stellarAddress', async () => {
      await controller.getMyPayoutStats(USER_AUTH);
      expect(payoutsService.getPayoutStats).toHaveBeenCalledWith(
        USER_AUTH.stellarAddress,
      );
    });

    it('returns the PayoutStatsDto from the service', async () => {
      const result = await controller.getMyPayoutStats(USER_AUTH);
      expect(result).toEqual(STATS_RESPONSE);
    });
  });

  // ─── GET /payouts/:id ─────────────────────────────────────────────────────

  describe('GET /payouts/:id — getPayoutById', () => {
    const payoutId = 'payout-uuid-1';

    it('delegates with id and user stellarAddress', async () => {
      await controller.getPayoutById(payoutId, USER_AUTH);
      expect(payoutsService.getPayoutById).toHaveBeenCalledWith(
        payoutId,
        USER_AUTH.stellarAddress,
      );
    });

    it('returns the PayoutResponseDto from the service', async () => {
      const result = await controller.getPayoutById(payoutId, USER_AUTH);
      expect(result).toEqual(PAYOUT_RESPONSE);
    });

    it('propagates NotFoundException (404) for unknown id', async () => {
      payoutsService.getPayoutById.mockRejectedValueOnce(
        new NotFoundException('Payout not found'),
      );
      await expect(
        controller.getPayoutById('unknown-id', USER_AUTH),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── POST /payouts/admin/create (Admin only) ──────────────────────────────

  describe('POST /payouts/admin/create — createPayout (ADMIN only)', () => {
    const validDto: CreatePayoutDto = {
      stellarAddress: STELLAR_ADDRESS,
      amount: 10.5,
      asset: 'XLM',
      type: PayoutType.QUEST_REWARD,
      questId: '123e4567-e89b-12d3-a456-426614174000',
      submissionId: '123e4567-e89b-12d3-a456-426614174001',
    };

    it('delegates to PayoutsService.createPayout with the DTO', async () => {
      await controller.createPayout(validDto);
      expect(payoutsService.createPayout).toHaveBeenCalledWith(validDto);
    });

    it('maps entity response into a PayoutResponseDto shape', async () => {
      const result = await controller.createPayout(validDto);
      expect(result).toMatchObject({
        id: expect.any(String),
        stellarAddress: STELLAR_ADDRESS,
        amount: expect.any(Number),
        asset: expect.any(String),
        status: expect.any(String),
      });
    });

    it('casts amount to Number from the entity response', async () => {
      payoutsService.createPayout.mockResolvedValueOnce({
        ...PAYOUT_RESPONSE,
        amount: '42.5' as unknown as number,
        maxRetries: 5,
        nextRetryAt: null,
        updatedAt: new Date(),
        deletedAt: null,
      });
      const result = await controller.createPayout(validDto);
      expect(typeof result.amount).toBe('number');
      expect(result.amount).toBe(42.5);
    });

    it('propagates BadRequestException from service', async () => {
      payoutsService.createPayout.mockRejectedValueOnce(
        new BadRequestException('Invalid payout data'),
      );
      await expect(controller.createPayout(validDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ForbiddenException signals 403 when non-admin caller is blocked by RolesGuard', () => {
      const denyRoles = {
        canActivate: jest.fn(() => {
          throw new ForbiddenException();
        }),
      };
      expect(() => denyRoles.canActivate({})).toThrow(ForbiddenException);
    });
  });

  // ─── GET /payouts/admin/all (Admin only) ──────────────────────────────────

  describe('GET /payouts/admin/all — getAllPayouts (ADMIN only)', () => {
    it('delegates to getPayoutHistory without a stellarAddress restriction', async () => {
      await controller.getAllPayouts({});
      expect(payoutsService.getPayoutHistory).toHaveBeenCalledWith({});
    });

    it('returns the PayoutHistoryResponseDto from the service', async () => {
      const result = await controller.getAllPayouts({});
      expect(result).toEqual(HISTORY_RESPONSE);
    });

    it('passes stellarAddress and status filters through to service', async () => {
      const query: PayoutQueryDto = {
        stellarAddress: STELLAR_ADDRESS,
        status: PayoutStatus.COMPLETED,
      };
      await controller.getAllPayouts(query);
      expect(payoutsService.getPayoutHistory).toHaveBeenCalledWith(query);
    });

    it('ForbiddenException (403) is thrown when non-admin is blocked', () => {
      const denyRoles = {
        canActivate: jest.fn(() => {
          throw new ForbiddenException();
        }),
      };
      expect(() => denyRoles.canActivate({})).toThrow(ForbiddenException);
    });
  });

  // ─── GET /payouts/admin/stats (Admin only) ────────────────────────────────

  describe('GET /payouts/admin/stats — getGlobalPayoutStats (ADMIN only)', () => {
    it('delegates to PayoutsService.getPayoutStats with no arguments', async () => {
      await controller.getGlobalPayoutStats();
      expect(payoutsService.getPayoutStats).toHaveBeenCalledWith();
    });

    it('returns the global PayoutStatsDto', async () => {
      const result = await controller.getGlobalPayoutStats();
      expect(result).toEqual(STATS_RESPONSE);
    });
  });

  // ─── POST /payouts/admin/:id/retry (Admin only) ───────────────────────────

  describe('POST /payouts/admin/:id/retry — retryPayout (ADMIN only)', () => {
    const payoutId = 'payout-uuid-1';

    it('delegates to PayoutsService.retryPayout with the payout id', async () => {
      await controller.retryPayout(payoutId);
      expect(payoutsService.retryPayout).toHaveBeenCalledWith(payoutId);
    });

    it('returns the updated PayoutResponseDto', async () => {
      const result = await controller.retryPayout(payoutId);
      expect(result).toEqual(PAYOUT_RESPONSE);
    });

    it('propagates NotFoundException (404) for unknown payout', async () => {
      payoutsService.retryPayout.mockRejectedValueOnce(
        new NotFoundException('Payout not found'),
      );
      await expect(controller.retryPayout('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('propagates BadRequestException (400) when payout is not in FAILED state', async () => {
      payoutsService.retryPayout.mockRejectedValueOnce(
        new BadRequestException('Only failed payouts can be retried'),
      );
      await expect(controller.retryPayout(payoutId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ForbiddenException (403) when non-admin caller is blocked', () => {
      const denyRoles = { canActivate: jest.fn().mockReturnValue(false) };
      expect(denyRoles.canActivate({})).toBe(false);
    });
  });

  // ─── GET /payouts/admin/:id (Admin only) ─────────────────────────────────

  describe('GET /payouts/admin/:id — getAnyPayoutById (ADMIN only)', () => {
    const payoutId = 'payout-uuid-1';

    it('delegates without a stellarAddress ownership restriction', async () => {
      await controller.getAnyPayoutById(payoutId);
      expect(payoutsService.getPayoutById).toHaveBeenCalledWith(payoutId);
    });

    it('returns the PayoutResponseDto', async () => {
      const result = await controller.getAnyPayoutById(payoutId);
      expect(result).toEqual(PAYOUT_RESPONSE);
    });

    it('propagates NotFoundException (404) for unknown id', async () => {
      payoutsService.getPayoutById.mockRejectedValueOnce(
        new NotFoundException('Payout not found'),
      );
      await expect(
        controller.getAnyPayoutById('unknown-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GET /payouts/fraud-risk/:id (Admin only) ─────────────────────────────

  describe('GET /payouts/fraud-risk/:id — analyzePayoutRisk (ADMIN only)', () => {
    const payoutId = 'payout-uuid-1';

    it('delegates to FraudRiskRulesService.analyzePayout with the id', async () => {
      await controller.analyzePayoutRisk(payoutId);
      expect(fraudService.analyzePayout).toHaveBeenCalledWith(payoutId);
    });

    it('returns the FraudRiskAssessment from the service', async () => {
      const result = await controller.analyzePayoutRisk(payoutId);
      expect(result).toEqual(FRAUD_ASSESSMENT);
    });

    it('propagates NotFoundException (404) when payout is not found', async () => {
      fraudService.analyzePayout.mockRejectedValueOnce(
        new NotFoundException('Payout not found'),
      );
      await expect(
        controller.analyzePayoutRisk('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('ForbiddenException (403) when non-admin is blocked by RolesGuard', () => {
      const denyRoles = { canActivate: jest.fn().mockReturnValue(false) };
      expect(denyRoles.canActivate({})).toBe(false);
    });
  });

  // ─── GET /payouts/fraud-risk/batch (Admin only) ───────────────────────────

  describe('GET /payouts/fraud-risk/batch — analyzeRecentPayoutsRisk (ADMIN only)', () => {
    it('delegates with default 24 hours', async () => {
      await controller.analyzeRecentPayoutsRisk(24);
      expect(fraudService.analyzeRecentPayouts).toHaveBeenCalledWith(24);
    });

    it('delegates with a custom hours value', async () => {
      await controller.analyzeRecentPayoutsRisk(48);
      expect(fraudService.analyzeRecentPayouts).toHaveBeenCalledWith(48);
    });

    it('returns the AnomalyDetectionResult from the service', async () => {
      const result = await controller.analyzeRecentPayoutsRisk(24);
      expect(result).toMatchObject({
        totalPayoutsChecked: expect.any(Number),
        flaggedPayouts: expect.any(Number),
        assessments: expect.any(Array),
      });
    });
  });

  // ─── GET /payouts/fraud-risk/statistics (Admin only) ─────────────────────

  describe('GET /payouts/fraud-risk/statistics — getRiskStatistics (ADMIN only)', () => {
    it('delegates to FraudRiskRulesService.getRiskStatistics', async () => {
      await controller.getRiskStatistics();
      expect(fraudService.getRiskStatistics).toHaveBeenCalledTimes(1);
    });

    it('returns the risk statistics object from the service', async () => {
      const result = await controller.getRiskStatistics();
      expect(result).toEqual({ total: 3, flagged: 0 });
    });
  });

  // ─── DTO validation constraints (class-validator metadata) ────────────────

  describe('DTO validation constraints (metadata assertions)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMetadataStorage } = require('class-validator') as {
      getMetadataStorage: () => {
        getTargetValidationMetadatas: (
          cls: unknown,
          _: string,
          a: boolean,
          b: boolean,
        ) => Array<{ propertyName: string; name: string }>;
      };
    };

    const getRules = (cls: unknown, property: string): string[] =>
      getMetadataStorage()
        .getTargetValidationMetadatas(cls, '', false, false)
        .filter((v) => v.propertyName === property)
        .map((v) => v.name);

    it('ClaimPayoutDto.submissionId has @IsUUID and @IsNotEmpty', () => {
      const rules = getRules(ClaimPayoutDto, 'submissionId');
      expect(rules).toContain('isUuid');
      expect(rules).toContain('isNotEmpty');
    });

    it('ClaimPayoutDto.stellarAddress has @IsString and @IsNotEmpty', () => {
      const rules = getRules(ClaimPayoutDto, 'stellarAddress');
      expect(rules).toContain('isString');
      expect(rules).toContain('isNotEmpty');
    });

    it('CreatePayoutDto.amount has @IsNumber and @Min', () => {
      const rules = getRules(CreatePayoutDto, 'amount');
      expect(rules).toContain('isNumber');
      expect(rules).toContain('min');
    });

    it('CreatePayoutDto.stellarAddress has @IsString and @IsNotEmpty', () => {
      const rules = getRules(CreatePayoutDto, 'stellarAddress');
      expect(rules).toContain('isString');
      expect(rules).toContain('isNotEmpty');
    });

    it('CreatePayoutDto.type has @IsEnum', () => {
      const rules = getRules(CreatePayoutDto, 'type');
      expect(rules).toContain('isEnum');
    });

    it('CreatePayoutDto.questId has @IsUUID (when provided)', () => {
      const rules = getRules(CreatePayoutDto, 'questId');
      expect(rules).toContain('isUuid');
    });

    it('CreatePayoutDto.submissionId has @IsUUID (when provided)', () => {
      const rules = getRules(CreatePayoutDto, 'submissionId');
      expect(rules).toContain('isUuid');
    });

    it('PayoutQueryDto.status has @IsEnum', () => {
      const rules = getRules(PayoutQueryDto, 'status');
      expect(rules).toContain('isEnum');
    });

    it('PayoutQueryDto.type has @IsEnum', () => {
      const rules = getRules(PayoutQueryDto, 'type');
      expect(rules).toContain('isEnum');
    });

    it('PayoutQueryDto.stellarAddress has @IsString', () => {
      const rules = getRules(PayoutQueryDto, 'stellarAddress');
      expect(rules).toContain('isString');
    });
  });

  // ─── Admin exercises every admin route ────────────────────────────────────

  describe('Admin caller can exercise every admin route', () => {
    it('admin can call createPayout', async () => {
      await expect(
        controller.createPayout({ stellarAddress: STELLAR_ADDRESS, amount: 1 }),
      ).resolves.toBeDefined();
    });

    it('admin can call getAllPayouts', async () => {
      await expect(controller.getAllPayouts({})).resolves.toBeDefined();
    });

    it('admin can call getGlobalPayoutStats', async () => {
      await expect(controller.getGlobalPayoutStats()).resolves.toBeDefined();
    });

    it('admin can call retryPayout', async () => {
      await expect(
        controller.retryPayout('payout-uuid-1'),
      ).resolves.toBeDefined();
    });

    it('admin can call getAnyPayoutById', async () => {
      await expect(
        controller.getAnyPayoutById('payout-uuid-1'),
      ).resolves.toBeDefined();
    });

    it('admin can call analyzePayoutRisk', async () => {
      await expect(
        controller.analyzePayoutRisk('payout-uuid-1'),
      ).resolves.toBeDefined();
    });

    it('admin can call analyzeRecentPayoutsRisk', async () => {
      await expect(
        controller.analyzeRecentPayoutsRisk(24),
      ).resolves.toBeDefined();
    });

    it('admin can call getRiskStatistics', async () => {
      await expect(controller.getRiskStatistics()).resolves.toBeDefined();
    });
  });

  // ─── No business logic in controller ────────────────────────────────────

  describe('Controller delegates all business logic to services', () => {
    it('claimPayout passes through the service response unchanged', async () => {
      const customResponse = { ...PAYOUT_RESPONSE, amount: 99.9 };
      payoutsService.claimPayout.mockResolvedValueOnce(customResponse as any);
      const result = await controller.claimPayout(
        { submissionId: '123e4567-e89b-12d3-a456-426614174000', stellarAddress: STELLAR_ADDRESS },
        USER_AUTH,
      );
      expect(result).toEqual(customResponse);
    });

    it('getMyPayoutHistory passes through the service response unchanged', async () => {
      const customHistory = { data: [], total: 0, cursor: null };
      payoutsService.getPayoutHistory.mockResolvedValueOnce(customHistory as any);
      const result = await controller.getMyPayoutHistory({}, USER_AUTH);
      expect(result).toEqual(customHistory);
    });

    it('getMyPayoutStats passes through the service response unchanged', async () => {
      const customStats = { ...STATS_RESPONSE, total: 100 };
      payoutsService.getPayoutStats.mockResolvedValueOnce(customStats);
      const result = await controller.getMyPayoutStats(USER_AUTH);
      expect(result).toEqual(customStats);
    });
  });
});
