import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { TiersService } from './tiers.service.js';
import { UpdateTierDto } from './dto/update-tier.dto.js';

@ApiTags('Admin Tiers')
@ApiBearerAuth('JWT-auth')
@Controller('admin/tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminTiersController {
  constructor(private readonly tiersService: TiersService) {}

  /**
   * PATCH /admin/tiers/:id
   * Updates tier with optimistic concurrency locking and quota validation.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update package tier',
    description: 'Updates package tier price and quota with optimistic locking version check. Quota cannot be decreased below active seats.',
  })
  @ApiParam({ name: 'id', description: 'Tier UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package tier updated successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid quota (cannot be less than active seats).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Tier not found.' })
  @ApiResponse({ status: 409, description: 'Version conflict - Tier modified by concurrent transaction.' })
  async updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTierDto,
  ) {
    return this.tiersService.update(id, dto);
  }
}
