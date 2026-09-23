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
import { PackagesService } from './packages.service.js';
import { TiersService } from './tiers.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { QueryPackageDto } from './dto/query-package.dto.js';
import { CreateTierDto } from './dto/create-tier.dto.js';

@ApiTags('Admin Packages')
@ApiBearerAuth('JWT-auth')
@Controller('admin/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
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
  @ApiOperation({
    summary: 'List all packages (Admin)',
    description: 'Retrieves all packages across all statuses (DRAFT, PUBLISHED, ARCHIVED).',
  })
  @ApiResponse({ status: 200, description: 'Package catalog list returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getAllPackages(@Query() query: QueryPackageDto) {
    return this.packagesService.findAll(query);
  }

  /**
   * POST /admin/packages
   * Creates a new package.
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new package',
    description: 'Creates a package in DRAFT status.',
  })
  @ApiResponse({ status: 201, description: 'Package created successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async createPackage(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  /**
   * GET /admin/packages/:id
   * Admin view of any package.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get package details (Admin)',
    description: 'Retrieves full details of a package regardless of status.',
  })
  @ApiParam({ name: 'id', description: 'Package UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package details returned.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Package not found.' })
  async getPackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findById(id, false);
  }

  /**
   * PATCH /admin/packages/:id
   * Updates package with optimistic concurrency locking.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update package',
    description: 'Updates package fields using optimistic locking version comparison.',
  })
  @ApiParam({ name: 'id', description: 'Package UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Package not found.' })
  @ApiResponse({ status: 409, description: 'Version conflict - Package was modified by another transaction.' })
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
  @ApiOperation({
    summary: 'Publish package',
    description: 'Changes package status to PUBLISHED making it visible on public endpoints.',
  })
  @ApiParam({ name: 'id', description: 'Package UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package published successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Package not found.' })
  async publishPackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.publish(id);
  }

  /**
   * PATCH /admin/packages/:id/archive
   * Archives package.
   */
  @Patch(':id/archive')
  @ApiOperation({
    summary: 'Archive package',
    description: 'Changes package status to ARCHIVED removing it from active booking flows.',
  })
  @ApiParam({ name: 'id', description: 'Package UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package archived successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Package not found.' })
  async archivePackage(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.archive(id);
  }

  /**
   * POST /admin/packages/:packageId/tiers
   * Adds a tier to a package.
   */
  @Post(':packageId/tiers')
  @ApiOperation({
    summary: 'Create package tier',
    description: 'Creates a pricing tier and seat quota under the specified package.',
  })
  @ApiParam({ name: 'packageId', description: 'Package UUID', type: String })
  @ApiResponse({ status: 201, description: 'Package tier created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request or quota invalid.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Package not found.' })
  async createTier(
    @Param('packageId', ParseUUIDPipe) packageId: string,
    @Body() dto: CreateTierDto,
  ) {
    return this.tiersService.create(packageId, dto);
  }
}
