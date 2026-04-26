import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TwoFactorAuth } from '../entities/two-factor.entity';
import { TotpService, TotpSetupResult } from './totp.service';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    @InjectRepository(TwoFactorAuth)
    private readonly twoFactorRepository: Repository<TwoFactorAuth>,
    private readonly totpService: TotpService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Setup
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Begin 2FA setup for a user.
   *
   * Creates (or replaces) a pending TwoFactorAuth record with enabled=false.
   * The user must call verify2fa() with a valid TOTP code to activate it.
   *
   * Returns the secret and QR code — shown ONCE to the user.
   */
  async initiate2faSetup(stellarAddress: string): Promise<TotpSetupResult> {
    const existing = await this.twoFactorRepository.findOne({
      where: { stellarAddress },
    });

    if (existing?.enabled) {
      throw new ConflictException(
        '2FA is already enabled. Disable it first before re-enrolling.',
      );
    }

    const setup = await this.totpService.generateSetup(stellarAddress);

    if (existing) {
      // Overwrite the pending (unconfirmed) record
      existing.secret = setup.secret;
      existing.enabled = false;
      await this.twoFactorRepository.save(existing);
    } else {
      const record = this.twoFactorRepository.create({
        stellarAddress,
        secret: setup.secret,
        enabled: false,
      });
      await this.twoFactorRepository.save(record);
    }

    this.logger.log(`2FA setup initiated for ${stellarAddress}`);
    return setup;
  }

  /**
   * Confirm 2FA setup by verifying the first TOTP code.
   * Activates 2FA (sets enabled=true).
   */
  async confirm2faSetup(
    stellarAddress: string,
    totpCode: string,
  ): Promise<void> {
    const record = await this.getRecordWithSecret(stellarAddress);

    if (!record) {
      throw new NotFoundException(
        '2FA setup not initiated. Call POST /auth/2fa/setup first.',
      );
    }

    if (record.enabled) {
      throw new ConflictException('2FA is already enabled.');
    }

    const valid = this.totpService.verifyToken(record.secret, totpCode);
    if (!valid) {
      throw new UnauthorizedException('Invalid TOTP code. Please try again.');
    }

    record.enabled = true;
    record.lastVerifiedAt = new Date();
    await this.twoFactorRepository.save(record);

    this.logger.log(`2FA confirmed and enabled for ${stellarAddress}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Disable
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Disable 2FA for a user after verifying their current TOTP code.
   * Requires a valid code to prevent accidental or malicious disabling.
   */
  async disable2fa(stellarAddress: string, totpCode: string): Promise<void> {
    const record = await this.getRecordWithSecret(stellarAddress);

    if (!record?.enabled) {
      throw new BadRequestException('2FA is not enabled for this account.');
    }

    const valid = this.totpService.verifyToken(record.secret, totpCode);
    if (!valid) {
      throw new UnauthorizedException(
        'Invalid TOTP code. Cannot disable 2FA.',
      );
    }

    await this.twoFactorRepository.remove(record);
    this.logger.log(`2FA disabled for ${stellarAddress}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Verification (used during login)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verify a TOTP code during login.
   * Throws UnauthorizedException if the code is invalid.
   * Updates lastVerifiedAt on success.
   */
  async verifyLoginCode(
    stellarAddress: string,
    totpCode: string,
  ): Promise<void> {
    const record = await this.getRecordWithSecret(stellarAddress);

    if (!record?.enabled) {
      // 2FA not enabled — nothing to verify
      return;
    }

    const valid = this.totpService.verifyToken(record.secret, totpCode);
    if (!valid) {
      throw new UnauthorizedException(
        'Invalid or expired 2FA code. Please check your authenticator app.',
      );
    }

    record.lastVerifiedAt = new Date();
    await this.twoFactorRepository.save(record);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns whether 2FA is enabled for a given address.
   */
  async is2faEnabled(stellarAddress: string): Promise<boolean> {
    const record = await this.twoFactorRepository.findOne({
      where: { stellarAddress },
    });
    return record?.enabled ?? false;
  }

  /**
   * Returns the full 2FA status record (without the secret).
   */
  async get2faStatus(
    stellarAddress: string,
  ): Promise<{ enabled: boolean }> {
    const enabled = await this.is2faEnabled(stellarAddress);
    return { enabled };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Internal helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load the TwoFactorAuth record including the secret column
   * (which is excluded from normal SELECT queries via select:false).
   */
  private async getRecordWithSecret(
    stellarAddress: string,
  ): Promise<TwoFactorAuth | null> {
    return this.twoFactorRepository
      .createQueryBuilder('tfa')
      .addSelect('tfa.secret')
      .where('tfa.stellarAddress = :stellarAddress', { stellarAddress })
      .getOne();
  }
}
