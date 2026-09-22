import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { Package } from './entities/package.entity.js';
import { PackageTier } from './entities/package-tier.entity.js';
import { PackagesService } from './packages.service.js';
import { TiersService } from './tiers.service.js';
import { PackagesController } from './packages.controller.js';
import { AdminPackagesController } from './admin-packages.controller.js';
import { AdminTiersController } from './admin-tiers.controller.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([Package, PackageTier]),
  ],
  controllers: [
    PackagesController,
    AdminPackagesController,
    AdminTiersController,
  ],
  providers: [PackagesService, TiersService],
  exports: [PackagesService, TiersService, TypeOrmModule],
})
export class PackagesModule {}
