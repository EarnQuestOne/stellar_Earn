import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class RequestErasureDto {
  @ApiPropertyOptional({
    description: 'Optional reason for the erasure request',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class AdminInitiateErasureDto {
  @ApiProperty({ description: 'Id of the user whose account is erased' })
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @ApiPropertyOptional({
    description: 'Optional operator/legal reason for the request',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
