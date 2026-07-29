import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ValidationPipe,
  ArgumentMetadata,
} from '@nestjs/common';

import { AdminController, AdminService } from './admin.module';
import { GetUsersQueryDto } from './dto/get-users-query.dto';
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

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should call adminService.getUsers with provided query DTO', () => {
      const query: GetUsersQueryDto = { page: 1, limit: 10 };

      controller.getUsers(query);

      expect(service.getUsers).toHaveBeenCalledWith(1, 10);
    });

    it('should apply default pagination values when query object is empty', () => {
      controller.getUsers({});

      expect(service.getUsers).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('GetUsersQueryDto Validation', () => {
    let target: ValidationPipe;

    const metadata: ArgumentMetadata = {
      type: 'query',
      metatype: GetUsersQueryDto,
      data: '',
    };

    beforeEach(() => {
      target = new ValidationPipe({ transform: true });
    });

    it('should transform valid numeric string parameters', async () => {
      const result = await target.transform(
        { page: '2', limit: '50' },
        metadata,
      );

      expect(result).toEqual({ page: 2, limit: 50 });
    });

    it('should accept valid boundary values (page: 1, limit: 100)', async () => {
      const result = await target.transform(
        { page: '1', limit: '100' },
        metadata,
      );

      expect(result).toEqual({ page: 1, limit: 100 });
    });

    it('should reject NaN / non-numeric string values with 400', async () => {
      await expect(
        target.transform({ page: 'abc', limit: '20' }, metadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-integer numeric values with 400', async () => {
      await expect(
        target.transform({ page: '1.5', limit: '20' }, metadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        target.transform({ page: '1', limit: '2.7' }, metadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject zero or negative values with 400', async () => {
      await expect(
        target.transform({ page: '0', limit: '20' }, metadata),
      ).rejects.toThrow(BadRequestException);

      await expect(
        target.transform({ page: '1', limit: '-5' }, metadata),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject oversized limit values exceeding 100 with 400', async () => {
      await expect(
        target.transform({ page: '1', limit: '101' }, metadata),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserById', () => {
    it('should call adminService.getUserById', () => {
      const userId = '1';

      controller.getUserById(userId);

      expect(service.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should propagate a 404 NotFoundException when the user is missing', async () => {
      mockAdminService.getUserById.mockRejectedValueOnce(
        new NotFoundException('User missing not found'),
      );

      await expect(controller.getUserById('missing')).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('guards', () => {
    it('should protect the controller with the admin guard stack', () => {
      const guards =
        Reflect.getMetadata('__guards__', AdminController) ?? [];

      expect(guards).toEqual(
        expect.arrayContaining([
          JwtAuthGuard,
          RolesGuard,
          IpWhitelistGuard,
        ]),
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