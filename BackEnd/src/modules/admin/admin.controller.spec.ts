import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AdminController, AdminService } from './admin.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { IpWhitelistGuard } from '../../common/guards/ip-whitelist.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    getPlatformStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockAdminService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IpWhitelistGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should call adminService.getUsers', () => {
      const page = 1;
      const limit = 10;
      controller.getUsers(page, limit);
      expect(service.getUsers).toHaveBeenCalledWith(page, limit);
    });

    it('should coerce query-string page/limit to numbers', () => {
      controller.getUsers('2' as unknown as number, '50' as unknown as number);
      expect(service.getUsers).toHaveBeenCalledWith(2, 50);
    });

    it('should apply default pagination values', () => {
      controller.getUsers();
      expect(service.getUsers).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('getUserById', () => {
    it('should call adminService.getUserById', () => {
      const userId = '1';
      controller.getUserById(userId);
      expect(service.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should propagate ForbiddenException when the user is missing', async () => {
      mockAdminService.getUserById.mockRejectedValueOnce(
        new ForbiddenException('User not found'),
      );
      await expect(controller.getUserById('missing')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('guards', () => {
    it('should protect the controller with the admin guard stack', () => {
      const guards = Reflect.getMetadata('__guards__', AdminController) ?? [];
      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard, IpWhitelistGuard]),
      );
    });
  });

  describe('getPlatformStats', () => {
    it('should call adminService.getPlatformStats', () => {
      controller.getPlatformStats();
      expect(service.getPlatformStats).toHaveBeenCalled();
    });
  });
});
