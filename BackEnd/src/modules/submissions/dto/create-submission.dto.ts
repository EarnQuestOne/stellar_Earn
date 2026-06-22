import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body for POST /quests/:questId/submissions.
 *
 * The userId is deliberately NOT part of this DTO — it is sourced from the
 * authenticated JWT via @CurrentUser(). Putting it in the body would let any
 * caller submit proof on someone else's behalf (a privilege-escalation bug
 * we explicitly avoid here).
 */
export class CreateSubmissionDto {
  @ApiProperty({
    description: 'Name of the proof file',
    example: 'kyc_verification.pdf',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description: 'Base64 encoded file content or file URL',
    example:
      'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmo=',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  fileContent: string;

  @ApiPropertyOptional({
    description:
      'Optional notes from the submitter, visible to the verifier during review',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
