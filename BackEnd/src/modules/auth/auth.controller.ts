import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
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
  async login(@Body() loginDto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.verifySignatureAndLogin(loginDto);
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
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
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
  async logout(@CurrentUser() user: AuthUser): Promise<{ message: string }> {
    await this.authService.revokeToken(user.id);
    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions logged out' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<{ message: string }> {
    await this.authService.revokeToken(user.id);
    return { message: 'All sessions logged out successfully' };
  }
}
