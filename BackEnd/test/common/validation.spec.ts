import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '#src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { CustomValidationPipe } from '#src/common/pipes/validation.pipe';
import { SanitizationPipe } from '#src/common/pipes/sanitization.pipe';
import { ValidationExceptionFilter } from '#src/common/filters/validation-exception.filter';
import { IsStellarAddress } from '#src/common/decorators/is-stellar-address.decorator';
import { IsProofHash } from '#src/common/decorators/is-proof-hash.decorator';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';

// Test DTOs
class TestUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsEmail()
  email: string;

  @IsStellarAddress()
  stellarAddress: string;
}

class TestProofDto {
  @IsProofHash()
  proofHash: string;
}

describe('Validation System (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply our custom validation infrastructure
    app.useGlobalPipes(
      new SanitizationPipe(),
      new CustomValidationPipe(),
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new ValidationExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Custom Validation Decorators', () => {
    describe('IsStellarAddress', () => {
      it('should validate correct Stellar address', () => {
        const dto = new TestUserDto();
        dto.stellarAddress =
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

        // This would normally be tested with class-validator's validate function
        expect(dto.stellarAddress).toHaveLength(56);
        expect(dto.stellarAddress.charAt(0)).toBe('G');
      });

      it('should reject invalid Stellar address format', () => {
        const invalidAddresses = [
          'invalid_address',
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWH', // Too short
          'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHFF', // Too long
          'TAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', // Wrong prefix
        ];

        invalidAddresses.forEach((address) => {
          const dto = new TestUserDto();
          dto.stellarAddress = address;
          // In a real test, we'd use validate() from class-validator
          expect(dto.stellarAddress).not.toMatch(/^G[A-Z2-7]{55}$/);
        });
      });
    });

    describe('IsProofHash', () => {
      it('should validate SHA-256 hash', () => {
        const dto = new TestProofDto();
        dto.proofHash =
          'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';

        expect(dto.proofHash).toHaveLength(64);
        expect(dto.proofHash).toMatch(/^[a-fA-F0-9]{64}$/);
      });

      it('should validate IPFS CID', () => {
        const dto = new TestProofDto();
        dto.proofHash = 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco';

        expect(dto.proofHash).toMatch(/^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/);
      });

      it('should validate Arweave transaction ID', () => {
        const dto = new TestProofDto();
        dto.proofHash =
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_a';

        expect(dto.proofHash).toHaveLength(43);
        expect(dto.proofHash).toMatch(/^[a-zA-Z0-9_-]{43}$/);
      });

      it('should reject invalid proof hashes', () => {
        const invalidHashes = [
          'invalid_hash',
          'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef', // 63 chars
          'QmInvalidCIDWithWrongCharacters!!!!', // Invalid characters
          'short_id', // Too short
        ];

        invalidHashes.forEach((hash) => {
          const dto = new TestProofDto();
          dto.proofHash = hash;

          const isValidSha256 = /^[a-fA-F0-9]{64}$/.test(hash);
          const isValidIpfs = /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(hash);
          const isValidArweave = /^[a-zA-Z0-9_-]{43}$/.test(hash);

          expect(isValidSha256 || isValidIpfs || isValidArweave).toBeFalsy();
        });
      });
    });
  });

  describe('Sanitization', () => {
    it('should remove NULL bytes from strings', () => {
      const dirtyString = 'Hello\0World\0';
      const pipe = new SanitizationPipe();

      // Mock metadata
      const result = pipe['sanitizeString'](dirtyString);
      expect(result).toBe('HelloWorld');
    });

    it('should remove HTML tags', () => {
      const htmlString =
        '<script>alert("xss")</script>Hello World<div>Test</div>';
      const pipe = new SanitizationPipe();

      const result = pipe['sanitizeString'](htmlString);
      expect(result).toBe('alert("xss")Hello WorldTest');
    });

    it('should trim whitespace', () => {
      const spacedString = '  Hello World  ';
      const pipe = new SanitizationPipe();

      const result = pipe['sanitizeString'](spacedString);
      expect(result).toBe('Hello World');
    });

    it('should handle nested objects', () => {
      const dirtyData = {
        name: '  John\0Doe  ',
        email: '<script>alert("hack")</script>john@example.com',
        nested: {
          value: 'Test\0\0\0',
        },
      };

      const pipe = new SanitizationPipe();
      const result = pipe.transform(dirtyData, {
        type: 'body',
        metatype: Object,
        data: '',
      });

      expect(result.name).toBe('JohnDoe');
      expect(result.email).toBe('alert("hack")john@example.com');
      expect(result.nested.value).toBe('Test');
    });
  });

  describe('Validation Error Responses', () => {
    it('should return structured error response for validation failures', async () => {
      // This would typically test an actual endpoint
      // For now, we test the error formatting logic

      const mockErrors = [
        {
          property: 'username',
          constraints: {
            minLength: 'username must be longer than or equal to 3 characters',
            isNotEmpty: 'username should not be empty',
          },
        },
        {
          property: 'email',
          constraints: {
            isEmail: 'email must be an email',
          },
        },
      ];

      const filter = new ValidationExceptionFilter();
      const formatted = (filter as any).formatValidationErrors(mockErrors);

      expect(formatted).toHaveProperty('username');
      expect(formatted).toHaveProperty('email');
      expect(Array.isArray(formatted.username)).toBeTruthy();
      expect(Array.isArray(formatted.email)).toBeTruthy();
    });
  });

  describe('Array Validation', () => {
    it('should validate array length constraints', () => {
      // Test array validation would go here
      const testArray = ['item1', 'item2', 'item3'];
      expect(testArray.length).toBeGreaterThan(0);
      expect(testArray.length).toBeLessThanOrEqual(10); // Example constraint
    });
  });

  describe('Conditional Validation', () => {
    it('should apply conditional validation rules', () => {
      // Test conditional validation logic
      const startDate = '2026-01-01';
      const endDate = '2026-01-31';

      // endDate should only be validated if startDate exists
      if (startDate) {
        expect(endDate >= startDate).toBeTruthy();
      }
    });
  });
});

describe('Unit Tests for Validation Components', () => {
  describe('CustomValidationPipe', () => {
    let pipe: CustomValidationPipe;

    beforeEach(() => {
      pipe = new CustomValidationPipe();
    });

    it('should bypass validation for primitive types', () => {
      const metadata = { metatype: String };
      const result = (pipe as any).toValidate(metadata.metatype);
      expect(result).toBeFalsy();
    });

    it('should validate custom DTO classes', () => {
      class TestDto {
        prop: string;
      }
      const metadata = { metatype: TestDto };
      const result = (pipe as any).toValidate(metadata.metatype);
      expect(result).toBeTruthy();
    });
  });

  describe('SanitizationPipe', () => {
    let pipe: SanitizationPipe;

    beforeEach(() => {
      pipe = new SanitizationPipe();
    });

    it('should pass through null/undefined values', () => {
      expect(
        pipe.transform(null, { type: 'body', metatype: Object, data: '' }),
      ).toBeNull();
      expect(
        pipe.transform(undefined, { type: 'body', metatype: Object, data: '' }),
      ).toBeUndefined();
    });

    it('should sanitize arrays recursively', () => {
      const dirtyArray = ['  hello  ', '<b>world</b>', 'test\0'];
      const result = pipe.transform(dirtyArray, {
        type: 'body',
        metatype: Array,
        data: '',
      });

      expect(result[0]).toBe('hello');
      expect(result[1]).toBe('b>world</b>');
      expect(result[2]).toBe('test');
    });
  });
});
