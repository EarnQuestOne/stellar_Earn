import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErasureService } from './erasure.service';
import { RequestErasureDto, AdminInitiateErasureDto } from './dto/erasure.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@ApiTags('privacy')
@Controller('privacy/erasure')
export class ErasureController {
  constructor(private readonly erasureService: ErasureService) {}

  @Post('requests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Request erasure of the authenticated user’s account (enters a cancellable grace period)',
  })
  @ApiResponse({
    status: 201,
    description: 'Erasure request created and scheduled',
  })
  async requestErasure(@Request() req: any, @Body() dto: RequestErasureDto) {
    const request = await this.erasureService.requestErasure(req.user.id, {
      requestedBy: req.user.id,
      reason: dto.reason,
    });
    return { success: true, data: request };
  }

  @Post('requests/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel an erasure request within the grace window',
  })
  @ApiResponse({
    status: 200,
    description: 'Erasure request cancelled',
  })
  async cancelErasure(@Param('id') id: string, @Request() req: any) {
    const request = await this.erasureService.cancelErasure(id, {
      id: req.user.id,
      role: req.user.role,
    });
    return { success: true, data: request };
  }

  @Get('requests/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check the status of an erasure request' })
  @ApiResponse({ status: 200, description: 'Erasure request status' })
  async getStatus(@Param('id') id: string, @Request() req: any) {
    const request = await this.erasureService.getStatus(id, {
      id: req.user.id,
      role: req.user.role,
    });
    return { success: true, data: request };
  }

  @Post('admin/requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Admin-initiated erasure on behalf of a user',
  })
  @ApiResponse({
    status: 201,
    description: 'Erasure request created on behalf of the user',
  })
  async adminInitiate(
    @Request() req: any,
    @Body() dto: AdminInitiateErasureDto,
  ) {
    const request = await this.erasureService.requestErasure(dto.userId, {
      requestedBy: req.user.id,
      reason: dto.reason,
    });
    return { success: true, data: request };
  }
}
