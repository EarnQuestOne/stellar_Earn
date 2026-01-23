import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { QuestsService } from './quests.service';
import { CreateQuestDto } from './dto/create-quest.dto';
import { UpdateQuestDto } from './dto/update-quest.dto';
import { QueryQuestsDto } from './dto/query-quests.dto';
import {
    QuestResponseDto,
    PaginatedQuestsResponseDto,
} from './dto/quest-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import type { AuthUser } from '../auth/auth.service';

@ApiTags('Quests')
@Controller('quests')
export class QuestsController {
    constructor(private readonly questsService: QuestsService) { }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new quest (Admin only)' })
    @ApiResponse({
        status: 201,
        description: 'Quest created successfully',
        type: QuestResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
    async create(
        @Body() createQuestDto: CreateQuestDto,
        @CurrentUser() user: AuthUser,
    ): Promise<QuestResponseDto> {
        return this.questsService.create(createQuestDto, user.stellarAddress);
    }

    @Get()
    @ApiOperation({ summary: 'Get all quests with filtering and pagination' })
    @ApiResponse({
        status: 200,
        description: 'Quests retrieved successfully',
        type: PaginatedQuestsResponseDto,
    })
    async findAll(
        @Query() queryDto: QueryQuestsDto,
    ): Promise<PaginatedQuestsResponseDto> {
        return this.questsService.findAll(queryDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single quest by ID' })
    @ApiParam({ name: 'id', description: 'Quest ID (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Quest retrieved successfully',
        type: QuestResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Quest not found' })
    async findOne(@Param('id') id: string): Promise<QuestResponseDto> {
        return this.questsService.findOne(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a quest (Admin only, ownership required)' })
    @ApiParam({ name: 'id', description: 'Quest ID (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Quest updated successfully',
        type: QuestResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Invalid input or status transition' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Not quest owner' })
    @ApiResponse({ status: 404, description: 'Quest not found' })
    async update(
        @Param('id') id: string,
        @Body() updateQuestDto: UpdateQuestDto,
        @CurrentUser() user: AuthUser,
    ): Promise<QuestResponseDto> {
        return this.questsService.update(id, updateQuestDto, user.stellarAddress);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a quest (Admin only, ownership required)' })
    @ApiParam({ name: 'id', description: 'Quest ID (UUID)' })
    @ApiResponse({ status: 204, description: 'Quest deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Not quest owner' })
    @ApiResponse({ status: 404, description: 'Quest not found' })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: AuthUser,
    ): Promise<void> {
        return this.questsService.remove(id, user.stellarAddress);
    }
}
