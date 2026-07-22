import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrivacyLevel } from '../entities/user.entity';

export class SocialLinksDto {
  @ApiPropertyOptional({ description: 'Twitter handle', example: '@alice' })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional({ description: 'GitHub username', example: 'alice' })
  @IsOptional()
  @IsString()
  github?: string;

  @ApiPropertyOptional({ description: 'Discord handle', example: 'alice#1234' })
  @IsOptional()
  @IsString()
  discord?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://alice.dev',
  })
  @IsOptional()
  @IsUrl()
  website?: string;
}

export class UpdateProfileDto {
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
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'Profile privacy level',
    enum: PrivacyLevel,
  })
  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyLevel?: PrivacyLevel;

  @ApiPropertyOptional({ type: SocialLinksDto, description: 'Social links' })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}
