import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../users/enums/user-role.enum.js';
import { PackagesService } from './packages.service.js';
import { TiersService } from './tiers.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { QueryPackageDto } from './dto/query-package.dto.js';
import { CreateTierDto } from './dto/create-tier.dto.js';

@Controller('admin/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPackagesController {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly tiersService: TiersService,
  ) {}

  /**
   * GET /admin/packages
   * Lists all packages (draft, published, archived).
   */
  @Get()
  async getAllPackages(@Query() query: QueryPackageDto) {
    return this.packagesService.findAll(query);
  }

  /**
   * POST /admin/packages
   * Creates a new package.
   */
  @Post()
  async createPackage(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  /**
   * GET /admin/packages/:id
   * Admin view of any package.
   */
  @Get(':id')
  async getPackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findById(id, false);
  }

  /**
   * PATCH /admin/packages/:id
   * Updates package with optimistic concurrency locking.
   */
  @Patch(':id')
  async updatePackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageDto,
  ) {
    return this.packagesService.update(id, dto);
  }

  /**
   * PATCH /admin/packages/:id/publish
   * Publishes package making it visible to users.
   */
  @Patch(':id/publish')
  async publishPackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.publish(id);
  }

  /**
   * PATCH /admin/packages/:id/archive
   * Archives package.
   */
  @Patch(':id/archive')
  async archivePackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.archive(id);
  }

  /**
   * POST /admin/packages/:packageId/tiers
   * Adds a tier to a package.
   */
  @Post(':packageId/tiers')
  async createTier(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() dto: CreateTierDto,
  ) {
    return this.tiersService.create(packageId, dto);
  }
}
