import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { AppealDisputeDto, OpenDisputeDto, ResolveDisputeDto } from './dto/dispute.dto';
import { DisputesService } from './disputes.service';

@Controller('disputes')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly service: DisputesService) {}

  @Post()
  open(@Body() dto: OpenDisputeDto, @CurrentUser() user: AuthUser) { return this.service.open(dto, user); }

  @Post(':id/appeal')
  appeal(@Param('id') id: string, @Body() dto: AppealDisputeDto, @CurrentUser() user: AuthUser) { return this.service.appeal(id, dto, user); }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto, @CurrentUser() user: AuthUser) { return this.service.resolve(id, dto, user); }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.service.list(user); }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.service.get(id, user); }
}