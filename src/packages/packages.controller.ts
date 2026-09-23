import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PackagesService } from './packages.service.js';
import { QueryPackageDto } from './dto/query-package.dto.js';

@ApiTags('Public Packages')
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  /**
   * GET /packages
   * Public list of published packages.
   */
  @Get()
  @ApiOperation({
    summary: 'List published packages',
    description: 'Public catalog of published packages with pagination and type filtering.',
  })
  @ApiResponse({ status: 200, description: 'List of published packages returned.' })
  async getPublishedPackages(@Query() query: QueryPackageDto) {
    return this.packagesService.findPublished(query);
  }

  /**
   * GET /packages/:id
   * Public view of a published package and its tiers.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get published package details',
    description: 'Retrieves public package details and tier pricing/quotas by package UUID.',
  })
  @ApiParam({ name: 'id', description: 'Package UUID', type: String })
  @ApiResponse({ status: 200, description: 'Package details with tiers returned.' })
  @ApiResponse({ status: 404, description: 'Package not found or not published.' })
  async getPackageDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findById(id, true);
  }
}
