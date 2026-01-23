import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ApproveSubmissionDto } from '../../src/modules/submissions/dto/approve-submission.dto';
import { RejectSubmissionDto } from '../../src/modules/submissions/dto/reject-submission.dto';

describe('Submission DTOs (Unit Tests)', () => {
  describe('ApproveSubmissionDto', () => {
    it('should validate with no notes (optional field)', async () => {
      const dto = plainToInstance(ApproveSubmissionDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid notes', async () => {
      const dto = plainToInstance(ApproveSubmissionDto, {
        notes: 'Great work! All requirements met.',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when notes exceed max length (1000 chars)', async () => {
      const dto = plainToInstance(ApproveSubmissionDto, {
        notes: 'a'.repeat(1001),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should validate with notes at max length (1000 chars)', async () => {
      const dto = plainToInstance(ApproveSubmissionDto, {
        notes: 'a'.repeat(1000),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('RejectSubmissionDto', () => {
    it('should fail when reason is missing', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNotEmpty');
    });

    it('should fail when reason is empty string', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: '',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail when reason is too short (< 10 chars)', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: 'short',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('minLength');
    });

    it('should fail when reason is too long (> 500 chars)', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: 'a'.repeat(501),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should validate with reason at min length (10 chars)', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: '1234567890',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with reason at max length (500 chars)', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: 'a'.repeat(500),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should validate with valid reason and optional notes', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: 'The proof provided does not meet the requirements.',
        notes: 'Please resubmit with proper documentation.',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail when notes exceed max length (1000 chars)', async () => {
      const dto = plainToInstance(RejectSubmissionDto, {
        reason: 'Valid reason that meets minimum length requirement',
        notes: 'a'.repeat(1001),
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const notesError = errors.find((e) => e.property === 'notes');
      expect(notesError?.constraints).toHaveProperty('maxLength');
    });
  });
});
