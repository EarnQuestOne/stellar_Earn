import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

export interface TotpSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

/**
 * TotpService — wraps otplib to provide TOTP secret generation,
 * QR code creation, and token verification.
 *
 * otplib defaults:
 *   - Algorithm : SHA1  (RFC 6238 / Google Authenticator compatible)
 *   - Digits    : 6
 *   - Step      : 30 s
 *   - Window    : ±1 step (allows 30 s clock skew)
 */
@Injectable()
export class TotpService {
  private readonly logger = new Logger(TotpService.name);
  private readonly issuer: string;

  constructor(private readonly configService: ConfigService) {
    this.issuer = this.configService.get<string>('TOTP_ISSUER', 'StellarEarn');

    // Allow ±1 step window to handle minor clock drift between client and server
    authenticator.options = { window: 1 };
  }

  /**
   * Generate a new TOTP secret and the corresponding otpauth:// URI.
   * Returns the secret (to be stored) and a QR code data URI (to be shown once).
   */
  async generateSetup(stellarAddress: string): Promise<TotpSetupResult> {
    const secret = authenticator.generateSecret(20); // 160-bit secret (RFC 4226 recommendation)

    const otpauthUrl = authenticator.keyuri(
      stellarAddress,
      this.issuer,
      secret,
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      width: 256,
    });

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  /**
   * Verify a 6-digit TOTP code against the stored secret.
   * Returns true if valid, false otherwise.
   * Never throws — callers decide how to handle invalid codes.
   */
  verifyToken(secret: string, token: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (err) {
      this.logger.warn(`TOTP verification error: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Generate a fresh TOTP token for a given secret.
   * Useful in tests and for debugging — not exposed via the API.
   */
  generateToken(secret: string): string {
    return authenticator.generate(secret);
  }
}
