import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyLevel } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'alice_123',
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({
    description: 'User email address',
    example: 'alice@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    minLength: 56,
    maxLength: 56,
  })
  @IsString()
  @MinLength(56)
  @MaxLength(56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar address format',
  })
  stellarAddress: string;

  @ApiPropertyOptional({
    description: 'Short user biography',
    example: 'Builder and blockchain enthusiast',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({
    description: 'Avatar image URL',
    example: 'https://example.com/avatar.png',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Profile privacy level',
    enum: PrivacyLevel,
    example: PrivacyLevel.PUBLIC,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyLevel?: PrivacyLevel;
}
