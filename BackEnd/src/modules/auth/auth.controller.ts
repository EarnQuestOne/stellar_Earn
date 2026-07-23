import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthUser } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ChallengeRequestDto,
  ChallengeResponseDto,
  LoginDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  serializeCookie,
  parseCookies,
} from '../../common/utils/security.utils';
import { getApplicationSecurityConfig } from '../../config/security.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a sign-in challenge for a Stellar address',
  })
  @ApiResponse({ status: 200, type: ChallengeResponseDto })
  async challenge(
    @Body() dto: ChallengeRequestDto,
  ): Promise<ChallengeResponseDto> {
    return this.authService.generateChallenge(dto.stellarAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with a signed Stellar challenge' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyAndLogin(loginDto);
    const securityConfig = getApplicationSecurityConfig(this.configService);

    res.append(
      'Set-Cookie',
      serializeCookie(
        securityConfig.cookies.accessTokenName,
        result.accessToken,
        {
          maxAgeMs: securityConfig.cookies.accessMaxAgeMs,
          secure: securityConfig.cookies.secure,
          sameSite: securityConfig.cookies.sameSite,
          httpOnly: true,
          path: '/',
        },
      ),
    );

    res.append(
      'Set-Cookie',
      serializeCookie(
        securityConfig.cookies.refreshTokenName,
        result.refreshToken,
        {
          maxAgeMs: securityConfig.cookies.refreshMaxAgeMs,
          secure: securityConfig.cookies.secure,
          sameSite: securityConfig.cookies.sameSite,
          httpOnly: true,
          path: '/api/v1/auth/refresh',
        },
      ),
    );

    return res.json({ success: true, user: result.user });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate a refresh token for a new access/refresh token pair',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token is invalid, revoked, or expired',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const securityConfig = getApplicationSecurityConfig(this.configService);
    const cookies = parseCookies(req.headers.cookie);
    const refreshToken =
      cookies[securityConfig.cookies.refreshTokenName] || dto.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        statusCode: 401,
        message: 'No refresh token provided',
      });
    }

    const result = await this.authService.refreshTokens(refreshToken);

    res.append(
      'Set-Cookie',
      serializeCookie(
        securityConfig.cookies.accessTokenName,
        result.accessToken,
        {
          maxAgeMs: securityConfig.cookies.accessMaxAgeMs,
          secure: securityConfig.cookies.secure,
          sameSite: securityConfig.cookies.sameSite,
          httpOnly: true,
          path: '/',
        },
      ),
    );

    res.append(
      'Set-Cookie',
      serializeCookie(
        securityConfig.cookies.refreshTokenName,
        result.refreshToken,
        {
          maxAgeMs: securityConfig.cookies.refreshMaxAgeMs,
          secure: securityConfig.cookies.secure,
          sameSite: securityConfig.cookies.sameSite,
          httpOnly: true,
          path: '/api/v1/auth/refresh',
        },
      ),
    );

    return res.json({ success: true });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke current session and clear auth cookies' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const securityConfig = getApplicationSecurityConfig(this.configService);

    await this.authService.revokeToken(user.id);

    res.append(
      'Set-Cookie',
      serializeCookie(securityConfig.cookies.accessTokenName, '', {
        maxAgeMs: 0,
        secure: securityConfig.cookies.secure,
        sameSite: securityConfig.cookies.sameSite,
        httpOnly: true,
        path: '/',
      }),
    );

    res.append(
      'Set-Cookie',
      serializeCookie(securityConfig.cookies.refreshTokenName, '', {
        maxAgeMs: 0,
        secure: securityConfig.cookies.secure,
        sameSite: securityConfig.cookies.sameSite,
        httpOnly: true,
        path: '/api/v1/auth/refresh',
      }),
    );

    return res.json({ message: 'Logged out successfully' });
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke all sessions and clear auth cookies' })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const securityConfig = getApplicationSecurityConfig(this.configService);

    await this.authService.revokeToken(user.id);

    res.append(
      'Set-Cookie',
      serializeCookie(securityConfig.cookies.accessTokenName, '', {
        maxAgeMs: 0,
        secure: securityConfig.cookies.secure,
        sameSite: securityConfig.cookies.sameSite,
        httpOnly: true,
        path: '/',
      }),
    );

    res.append(
      'Set-Cookie',
      serializeCookie(securityConfig.cookies.refreshTokenName, '', {
        maxAgeMs: 0,
        secure: securityConfig.cookies.secure,
        sameSite: securityConfig.cookies.sameSite,
        httpOnly: true,
        path: '/api/v1/auth/refresh',
      }),
    );

    return res.json({ message: 'All sessions revoked' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthUser) {
    return {
      stellarAddress: user.stellarAddress,
      role: user.role,
    };
  }
}
