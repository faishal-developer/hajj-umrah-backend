import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { PackagesService } from './packages.service.js';
import { QueryPackageDto } from './dto/query-package.dto.js';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  /**
   * GET /packages
   * Public list of published packages.
   */
  @Get()
  async getPublishedPackages(@Query() query: QueryPackageDto) {
    return this.packagesService.findPublished(query);
  }

  /**
   * GET /packages/:id
   * Public view of a published package and its tiers.
   */
  @Get(':id')
  async getPackageDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.packagesService.findById(id, true);
  }
}
