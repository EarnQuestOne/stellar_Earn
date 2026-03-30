import {
  IsString,
  IsNotEmpty,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStellarAddress } from '../../../common/decorators/is-stellar-address.decorator';

export class ChallengeRequestDto {
  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    minLength: 56,
    maxLength: 56,
  })
  @IsString()
  @IsNotEmpty()
  @IsStellarAddress({
    message: 'Must be a valid Stellar public key address',
  })
  @MaxLength(56)
  @MinLength(56)
  stellarAddress: string;
}

export class ChallengeResponseDto {
  @ApiProperty({
    description: 'Challenge message to be signed by the wallet',
  })
  challenge: string;

  @ApiProperty({
    description: 'Challenge expiration timestamp',
  })
  expiresAt: Date;
}

export class LoginDto {
  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    minLength: 56,
    maxLength: 56,
  })
  @IsString()
  @IsNotEmpty()
  @IsStellarAddress({
    message: 'Must be a valid Stellar public key address',
  })
  @MaxLength(56)
  @MinLength(56)
  stellarAddress: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the challenge message',
    example: 'base64_encoded_signature_here',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  signature: string;

  @ApiProperty({
    description: 'The original challenge message that was signed',
    example: 'Sign this message to authenticate: challenge_nonce_here',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  challenge: string;
}

export class UserResponseDto {
  @ApiProperty()
  stellarAddress: string;

  @ApiProperty()
  role: string;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiration in milliseconds',
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
  })
  user: UserResponseDto;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
