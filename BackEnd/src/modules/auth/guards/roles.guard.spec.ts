import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  const mockExecutionContext = (user?: { role?: Role }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    expect(guard.canActivate(mockExecutionContext({ role: Role.USER }))).toBe(
      true,
    );
  });

  it('should allow an admin caller when ADMIN role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(mockExecutionContext({ role: Role.ADMIN }))).toBe(
      true,
    );
  });

  it('should reject a non-admin caller when ADMIN role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(mockExecutionContext({ role: Role.USER }))).toBe(
      false,
    );
  });

  it('should read required roles from both handler and class', () => {
    const spy = jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN]);
    const handler = () => ({});
    const cls = class {};
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: Role.ADMIN } }),
      }),
      getHandler: () => handler,
      getClass: () => cls,
    } as unknown as ExecutionContext;

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [handler, cls]);
  });

  it('should accept any one of several required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.MODERATOR]);

    expect(
      guard.canActivate(mockExecutionContext({ role: Role.MODERATOR })),
    ).toBe(true);
  });
});
