import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { AuthUser } from '../auth.service';
import { TwoFactorService } from '../services/two-factor.service';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator';
import {
  Enable2faResponseDto,
  Verify2faDto,
  TwoFactorStatusDto,
} from '../dto/two-factor.dto';

@ApiTags('Two-Factor Authentication')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /auth/2fa/status
  // ─────────────────────────────────────────────────────────────────────────

  @Get('status')
  @ApiOperation({
    summary: 'Get 2FA status',
    description: 'Returns whether TOTP-based 2FA is currently enabled for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: '2FA status retrieved',
    type: TwoFactorStatusDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@CurrentUser() user: AuthUser): Promise<TwoFactorStatusDto> {
    return this.twoFactorService.get2faStatus(user.stellarAddress);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/2fa/setup
  // ─────────────────────────────────────────────────────────────────────────

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: '2fa-setup', limit: 5 })
  @ApiOperation({
    summary: 'Initiate 2FA setup',
    description:
      'Generates a TOTP secret and QR code. The user must scan the QR code with their ' +
      'authenticator app (Google Authenticator, Authy, etc.) and then call POST /auth/2fa/verify ' +
      'with a valid code to activate 2FA. The secret is shown only once.',
  })
  @ApiResponse({
    status: 200,
    description: 'TOTP secret and QR code generated',
    type: Enable2faResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: '2FA already enabled' })
  async setup(@CurrentUser() user: AuthUser): Promise<Enable2faResponseDto> {
    const result = await this.twoFactorService.initiate2faSetup(
      user.stellarAddress,
    );
    return {
      secret: result.secret,
      otpauthUrl: result.otpauthUrl,
      qrCodeDataUrl: result.qrCodeDataUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/2fa/verify
  // ─────────────────────────────────────────────────────────────────────────

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: '2fa-verify', limit: 10 })
  @ApiOperation({
    summary: 'Confirm 2FA setup',
    description:
      'Verifies the first TOTP code after setup to activate 2FA. ' +
      'Must be called after POST /auth/2fa/setup.',
  })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  @ApiResponse({ status: 404, description: '2FA setup not initiated' })
  @ApiResponse({ status: 409, description: '2FA already enabled' })
  async verify(
    @CurrentUser() user: AuthUser,
    @Body() dto: Verify2faDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.confirm2faSetup(
      user.stellarAddress,
      dto.totpCode,
    );
    return { message: '2FA has been enabled successfully.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /auth/2fa/disable
  // ─────────────────────────────────────────────────────────────────────────

  @Delete('disable')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: '2fa-disable', limit: 5 })
  @ApiOperation({
    summary: 'Disable 2FA',
    description:
      'Disables TOTP-based 2FA for the authenticated user. ' +
      'Requires a valid TOTP code to prevent accidental or malicious disabling.',
  })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: '2FA is not enabled' })
  @ApiResponse({ status: 401, description: 'Invalid TOTP code' })
  async disable(
    @CurrentUser() user: AuthUser,
    @Body() dto: Verify2faDto,
  ): Promise<{ message: string }> {
    await this.twoFactorService.disable2fa(user.stellarAddress, dto.totpCode);
    return { message: '2FA has been disabled successfully.' };
  }
}
