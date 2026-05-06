import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faResponseDto {
  @ApiProperty({
    description: 'Base32-encoded TOTP secret (store securely, shown once)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'otpauth:// URI for QR code generation',
    example: 'otpauth://totp/StellarEarn:GABC...?secret=JBSWY3DPEHPK3PXP&issuer=StellarEarn',
  })
  otpauthUrl: string;

  @ApiProperty({
    description: 'QR code as a data URI (PNG base64) for display in the UI',
    example: 'data:image/png;base64,...',
  })
  qrCodeDataUrl: string;
}

export class Verify2faDto {
  @ApiProperty({
    description: '6-digit TOTP code from the authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must contain only digits' })
  totpCode: string;
}

export class TwoFactorLoginDto {
  @ApiProperty({
    description: 'Stellar public key address',
    example: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
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

  @ApiProperty({
    description: '6-digit TOTP code (required only when 2FA is enabled)',
    example: '123456',
    required: false,
  })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'TOTP code must contain only digits' })
  totpCode?: string;
}

export class TwoFactorStatusDto {
  @ApiProperty({ description: 'Whether 2FA is currently enabled' })
  enabled: boolean;
}
