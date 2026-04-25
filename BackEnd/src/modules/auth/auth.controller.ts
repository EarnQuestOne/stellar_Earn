import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  HttpException,
  UnauthorizedException,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import {
  ChallengeRequestDto,
  ChallengeResponseDto,
  LoginDto,
  TokenResponseDto,
  RefreshTokenDto,
  UserResponseDto,
} from './dto/auth.dto';

const ACCESS_TOKEN_COOKIE = 'auth_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.trim().split('=');
    const name = parts[0];
    if (name) {
      cookies[name] = parts.slice(1).join('=');
    }
  });
  return cookies;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('challenge')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 10 })
  @ApiOperation({ summary: 'Generate authentication challenge' })
  @ApiResponse({
    status: 200,
    description: 'Challenge generated successfully',
    type: ChallengeResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async generateChallenge(
    @Body() dto: ChallengeRequestDto,
  ): Promise<ChallengeResponseDto> {
    return this.authService.generateChallenge(dto.stellarAddress);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 5 })
  @ApiOperation({ summary: 'Login with Stellar wallet signature' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or expired challenge',
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() loginDto: LoginDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.authService.verifySignatureAndLogin(loginDto);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      maxAge: result.expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: cookieDomain,
    });

    response.json({
      user: result.user,
      expiresIn: result.expiresIn,
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'auth', limit: 10 })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const cookies = parseCookies(request.headers.cookie);
    const refreshToken = cookies[REFRESH_TOKEN_COOKIE]
      || request.headers?.['x-refresh-token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN;

    response.cookie(ACCESS_TOKEN_COOKIE, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      maxAge: result.expiresIn,
      path: '/',
      domain: cookieDomain,
    });

    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: cookieDomain,
    });

    response.json({
      user: result.user,
      expiresIn: result.expiresIn,
    });
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Redirect to Google for authentication' })
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async googleCallback(@Req() req: Request): Promise<TokenResponseDto> {
    return this.authService.loginOAuthUser(req.user as any);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Redirect to GitHub for authentication' })
  githubAuth() {
    return;
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  async githubCallback(@Req() req: Request): Promise<TokenResponseDto> {
    return this.authService.loginOAuthUser(req.user as any);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return {
      stellarAddress: user.stellarAddress,
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    const stellarAddress = user.stellarAddress || user.id;
    await this.authService.revokeToken(stellarAddress);

    const cookieDomain = process.env.COOKIE_DOMAIN;
    response.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/', domain: cookieDomain });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/', domain: cookieDomain });

    response.json({ message: 'Logged out successfully' });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    const stellarAddress = user.stellarAddress || user.id;
    await this.authService.revokeToken(stellarAddress);

    const cookieDomain = process.env.COOKIE_DOMAIN;
    response.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/', domain: cookieDomain });
    response.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/', domain: cookieDomain });

    response.json({ message: 'All sessions logged out successfully' });
  }
}
