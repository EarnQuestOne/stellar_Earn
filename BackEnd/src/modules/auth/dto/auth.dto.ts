import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChallengeRequestDto {
  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z2-7]{55}$/, {
    message: 'Invalid Stellar address format',
  })
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
    example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  stellarAddress: string;

  @ApiProperty({
    description: 'Base64-encoded signature of the challenge message',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'The original challenge message that was signed',
  })
  @IsString()
  @IsNotEmpty()
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
