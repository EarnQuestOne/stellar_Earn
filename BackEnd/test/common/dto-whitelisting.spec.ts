/**
 * @file test/common/dto-whitelisting.spec.ts
 *
 * Unit tests for strict DTO whitelisting via CustomValidationPipe.
 *
 * These tests intentionally do **not** import AppModule or spin up any
 * database connection, so they run fast and in total isolation from
 * infrastructure.  They exercise the exact behaviour the issue requires:
 *
 *   1. Unknown fields are rejected with a 400 Bad Request.
 *   2. Valid payloads (all fields decorated) pass through unchanged.
 *   3. Optional decorated fields are preserved.
 *   4. The pipe still enforces existing class-validator constraints.
 *   5. Nested DTOs are also protected against unknown field injection.
 */

import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CustomValidationPipe } from '#src/common/pipes/validation.pipe';

// ── Test DTOs ─────────────────────────────────────────────────────────────────

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

class AddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;
}

class CreateOrderDto {
  @IsInt()
  @Min(1)
  quantity: number;

  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress: AddressDto;
}

enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

class AssignRoleDto {
  @IsEnum(Role)
  role: Role;
}

// ── Helper ────────────────────────────────────────────────────────────────────

const bodyMeta = (metatype: any) =>
  ({ type: 'body', metatype, data: '' } as any);

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CustomValidationPipe — strict DTO whitelisting', () => {
  let pipe: CustomValidationPipe;

  beforeEach(() => {
    pipe = new CustomValidationPipe();
  });

  // ── 1. Core whitelisting behaviour ──────────────────────────────────────────

  describe('unknown field injection', () => {
    it('should reject a payload that contains an extra field not defined on the DTO', async () => {
      const payload = {
        username: 'alice',
        email: 'alice@example.com',
        __proto__: { admin: true }, // common prototype-pollution attempt (stripped by JSON.parse but we test the pipe)
        isAdmin: true,              // plain unknown field
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should include a descriptive error message when unknown fields are sent', async () => {
      const payload = {
        username: 'alice',
        email: 'alice@example.com',
        internalScore: 9999,
      };

      let caughtError: BadRequestException | undefined;
      try {
        await pipe.transform(payload, bodyMeta(CreateUserDto));
      } catch (err) {
        caughtError = err as BadRequestException;
      }

      expect(caughtError).toBeInstanceOf(BadRequestException);
      const response = caughtError!.getResponse() as Record<string, any>;
      expect(response.message).toBe('Validation failed');
      // The error map should contain the offending property
      expect(response.errors).toHaveProperty('internalScore');
    });

    it('should reject multiple unknown fields and report all of them', async () => {
      const payload = {
        username: 'bob',
        email: 'bob@example.com',
        role: 'superadmin',
        verified: true,
        deletedAt: null,
      };

      let caughtError: BadRequestException | undefined;
      try {
        await pipe.transform(payload, bodyMeta(CreateUserDto));
      } catch (err) {
        caughtError = err as BadRequestException;
      }

      const response = caughtError!.getResponse() as Record<string, any>;
      expect(Object.keys(response.errors)).toEqual(
        expect.arrayContaining(['role', 'verified', 'deletedAt']),
      );
    });
  });

  // ── 2. Valid payloads pass through ──────────────────────────────────────────

  describe('valid payloads', () => {
    it('should transform and return a valid DTO instance for a fully-populated body', async () => {
      const payload = {
        username: 'alice',
        email: 'alice@example.com',
        bio: 'Blockchain enthusiast',
      };

      const result = await pipe.transform(payload, bodyMeta(CreateUserDto));

      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result.username).toBe('alice');
      expect(result.email).toBe('alice@example.com');
      expect(result.bio).toBe('Blockchain enthusiast');
    });

    it('should accept a payload that omits optional fields', async () => {
      const payload = {
        username: 'carol',
        email: 'carol@example.com',
      };

      const result = await pipe.transform(payload, bodyMeta(CreateUserDto));

      expect(result).toBeInstanceOf(CreateUserDto);
      expect(result.username).toBe('carol');
      expect(result.bio).toBeUndefined();
    });
  });

  // ── 3. Existing validation constraints still fire ────────────────────────────

  describe('constraint enforcement', () => {
    it('should reject a DTO that violates a known constraint (e.g. email format)', async () => {
      const payload = {
        username: 'dave',
        email: 'not-an-email',
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject a DTO with a string that is too short', async () => {
      const payload = {
        username: 'ab', // MinLength(3) violation
        email: 'ab@example.com',
      };

      let caughtError: BadRequestException | undefined;
      try {
        await pipe.transform(payload, bodyMeta(CreateUserDto));
      } catch (err) {
        caughtError = err as BadRequestException;
      }

      const response = caughtError!.getResponse() as Record<string, any>;
      expect(response.errors).toHaveProperty('username');
    });

    it('should reject an enum field with a value not in the enum', async () => {
      const payload = { role: 'superadmin' };

      await expect(
        pipe.transform(payload, bodyMeta(AssignRoleDto)),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── 4. Primitive / no-DTO passthrough ────────────────────────────────────────

  describe('primitive type passthrough', () => {
    it('should return the raw value unchanged when metatype is String', async () => {
      const result = await pipe.transform('hello', bodyMeta(String));
      expect(result).toBe('hello');
    });

    it('should return the raw value unchanged when metatype is Number', async () => {
      const result = await pipe.transform(42, bodyMeta(Number));
      expect(result).toBe(42);
    });

    it('should return the raw value when no metatype is provided', async () => {
      const result = await pipe.transform({ any: 'thing' }, bodyMeta(undefined));
      expect(result).toEqual({ any: 'thing' });
    });
  });

  // ── 5. Nested DTO whitelisting ───────────────────────────────────────────────

  describe('nested DTO whitelisting', () => {
    it('should reject an unknown field inside a nested DTO', async () => {
      const payload = {
        quantity: 2,
        shippingAddress: {
          street: '1 Main St',
          city: 'Starville',
          country: 'Anywhere', // not declared on AddressDto
        },
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateOrderDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept a valid nested DTO', async () => {
      const payload = {
        quantity: 3,
        shippingAddress: {
          street: '1 Main St',
          city: 'Starville',
        },
      };

      const result = await pipe.transform(payload, bodyMeta(CreateOrderDto));

      expect(result).toBeInstanceOf(CreateOrderDto);
      expect(result.quantity).toBe(3);
      expect(result.shippingAddress.city).toBe('Starville');
    });
  });

  // ── 6. Security-relevant field injection attempts ────────────────────────────

  describe('privilege-escalation field injection', () => {
    it('should block injection of an "isAdmin" flag', async () => {
      const payload = {
        username: 'mallory',
        email: 'mallory@example.com',
        isAdmin: true,
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block injection of a "role" override', async () => {
      const payload = {
        username: 'mallory',
        email: 'mallory@example.com',
        role: 'admin',
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block injection of a "deletedAt" timestamp (soft-delete bypass)', async () => {
      const payload = {
        username: 'mallory',
        email: 'mallory@example.com',
        deletedAt: null,
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block injection of a "createdAt" override', async () => {
      const payload = {
        username: 'mallory',
        email: 'mallory@example.com',
        createdAt: '2000-01-01T00:00:00Z',
      };

      await expect(
        pipe.transform(payload, bodyMeta(CreateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
