import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '#src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '#src/modules/auth/guards/roles.guard';
import { ROLES_KEY } from '#src/modules/auth/decorators/roles.decorator';
import { Role } from '#src/common/enums/role.enum';
import { ModerationController } from '#src/modules/moderation/moderation.controller';
import { ModerationService } from '#src/modules/moderation/moderation.service';
import { ModerationAction } from '#src/modules/moderation/entities/moderation-item.entity';
import { AppealStatus } from '#src/modules/moderation/entities/moderation-appeal.entity';

describe('ModerationController', () => {
  let controller: ModerationController;
  let service: jest.Mocked<
    Pick<
      ModerationService,
      | 'scanText'
      | 'listPending'
      | 'getDashboardStats'
      | 'applyAction'
      | 'createAppeal'
      | 'listAppealsPending'
      | 'resolveAppeal'
    >
  >;

  beforeEach(async () => {
    service = {
      scanText: jest.fn(),
      listPending: jest.fn(),
      getDashboardStats: jest.fn(),
      applyAction: jest.fn(),
      createAppeal: jest.fn(),
      listAppealsPending: jest.fn(),
      resolveAppeal: jest.fn(),
    } as unknown as typeof service;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [{ provide: ModerationService, useValue: service }],
    }).compile();

    controller = module.get<ModerationController>(ModerationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('scan', () => {
    it('delegates to scanText and wraps the result', async () => {
      const scanResult = {
        score: 0.9,
        keywordHits: [],
        labels: {},
        imageFlags: [],
        shouldBlock: true,
        shouldManualReview: false,
      };
      service.scanText.mockResolvedValue(scanResult);

      const res = await controller.scan({ text: 'hello' });

      expect(service.scanText).toHaveBeenCalledWith('hello');
      expect(res).toEqual({ success: true, data: scanResult });
    });
  });

  describe('dashboardPending', () => {
    it('applies default pagination when query is empty', async () => {
      service.listPending.mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      const res = await controller.dashboardPending({});

      expect(service.listPending).toHaveBeenCalledWith(1, 20);
      expect(res.success).toBe(true);
    });

    it('passes through explicit pagination', async () => {
      service.listPending.mockResolvedValue({
        items: [],
        total: 0,
        page: 3,
        limit: 50,
      });

      await controller.dashboardPending({ page: 3, limit: 50 });
      expect(service.listPending).toHaveBeenCalledWith(3, 50);
    });
  });

  describe('dashboardStats', () => {
    it('returns the service stats', async () => {
      service.getDashboardStats.mockResolvedValue({
        pendingManualReview: 2,
        pendingAppeals: 1,
      });

      const res = await controller.dashboardStats();
      expect(res).toEqual({
        success: true,
        data: { pendingManualReview: 2, pendingAppeals: 1 },
      });
    });
  });

  describe('applyAction', () => {
    it('passes the reviewer id from the request user', async () => {
      const item = { id: 'i1' };
      service.applyAction.mockResolvedValue(item as never);

      const res = await controller.applyAction(
        'i1',
        { action: ModerationAction.APPROVE, notes: 'ok' },
        { user: { id: 'admin-9' } },
      );

      expect(service.applyAction).toHaveBeenCalledWith(
        'i1',
        ModerationAction.APPROVE,
        'admin-9',
        'ok',
      );
      expect(res).toEqual({ success: true, data: { item } });
    });
  });

  describe('createAppeal', () => {
    it('passes the appellant id from the request user', async () => {
      const appeal = { id: 'a1' };
      service.createAppeal.mockResolvedValue(appeal as never);

      const res = await controller.createAppeal(
        { moderationItemId: 'i1', message: 'please review' },
        { user: { id: 'user-1' } },
      );

      expect(service.createAppeal).toHaveBeenCalledWith(
        'user-1',
        'i1',
        'please review',
      );
      expect(res).toEqual({ success: true, data: { appeal } });
    });
  });

  describe('appealsPending', () => {
    it('applies default pagination', async () => {
      service.listAppealsPending.mockResolvedValue({
        appeals: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await controller.appealsPending({});
      expect(service.listAppealsPending).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('resolveAppeal', () => {
    it('passes the resolver id from the request user', async () => {
      const appeal = { id: 'a1' };
      service.resolveAppeal.mockResolvedValue(appeal as never);

      const res = await controller.resolveAppeal(
        'a1',
        { resolution: AppealStatus.APPROVED, resolutionNote: 'valid' },
        { user: { id: 'admin-2' } },
      );

      expect(service.resolveAppeal).toHaveBeenCalledWith(
        'a1',
        AppealStatus.APPROVED,
        'admin-2',
        'valid',
      );
      expect(res).toEqual({ success: true, data: { appeal } });
    });
  });

  /**
   * Guard/role coverage. Rather than spinning up the HTTP layer, we assert the
   * guard and @Roles metadata attached to each handler — this is what actually
   * gates access in production and is cheap to verify by reflection.
   */
  describe('guard & role metadata', () => {
    const guardsOf = (handler: (...args: unknown[]) => unknown) =>
      (Reflect.getMetadata('__guards__', handler) ?? []) as Array<
        new (...args: unknown[]) => unknown
      >;
    const rolesOf = (handler: (...args: unknown[]) => unknown) =>
      Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;

    const proto = ModerationController.prototype;

    it('scan requires JWT auth only (any authenticated user)', () => {
      const guards = guardsOf(proto.scan).map((g) => g.name);
      expect(guards).toContain(JwtAuthGuard.name);
      expect(guards).not.toContain(RolesGuard.name);
      expect(rolesOf(proto.scan)).toBeUndefined();
    });

    it('createAppeal requires JWT auth only (owner appeals their own case)', () => {
      const guards = guardsOf(proto.createAppeal).map((g) => g.name);
      expect(guards).toContain(JwtAuthGuard.name);
      expect(guards).not.toContain(RolesGuard.name);
      expect(rolesOf(proto.createAppeal)).toBeUndefined();
    });

    it.each([
      ['dashboardPending', proto.dashboardPending],
      ['dashboardStats', proto.dashboardStats],
      ['applyAction', proto.applyAction],
      ['appealsPending', proto.appealsPending],
      ['resolveAppeal', proto.resolveAppeal],
    ])(
      '%s is gated by JWT + Roles guards and restricted to ADMIN/MODERATOR',
      (_name, handler) => {
        const guards = guardsOf(handler as never).map((g) => g.name);
        expect(guards).toContain(JwtAuthGuard.name);
        expect(guards).toContain(RolesGuard.name);
        expect(rolesOf(handler as never)).toEqual([Role.ADMIN, Role.MODERATOR]);
      },
    );
  });
});
