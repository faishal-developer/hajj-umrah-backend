import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { TiersService } from './tiers.service.js';
import { UpdateTierDto } from './dto/update-tier.dto.js';

@Controller('admin/tiers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTiersController {
  constructor(private readonly tiersService: TiersService) {}

  /**
   * PATCH /admin/tiers/:id
   * Updates tier with optimistic concurrency locking and quota validation.
   */
  @Patch(':id')
  async updateTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTierDto,
  ) {
    return this.tiersService.update(id, dto);
  }
}
