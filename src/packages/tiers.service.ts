import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackageTier } from './entities/package-tier.entity.js';
import { PackagesService } from './packages.service.js';
import { CreateTierDto } from './dto/create-tier.dto.js';
import { UpdateTierDto } from './dto/update-tier.dto.js';

@Injectable()
export class TiersService {
  constructor(
    @InjectRepository(PackageTier)
    private readonly tiersRepository: Repository<PackageTier>,
    private readonly packagesService: PackagesService,
  ) {}

  /**
   * Lists all tiers for a given package.
   */
  async findByPackage(packageId: string): Promise<PackageTier[]> {
    await this.packagesService.findById(packageId);

    return this.tiersRepository.find({
      where: { packageId },
      order: { price: 'ASC' },
    });
  }

  /**
   * Retrieves a single tier by ID.
   */
  async findById(id: string): Promise<PackageTier> {
    const tier = await this.tiersRepository.findOne({
      where: { id },
      relations: { package: true },
    });

    if (!tier) {
      throw new NotFoundException(`Tier with ID "${id}" not found`);
    }

    return tier;
  }

  /**
   * Creates a new tier under a package.
   */
  async create(packageId: string, dto: CreateTierDto): Promise<PackageTier> {
    await this.packagesService.findById(packageId);

    const tier = this.tiersRepository.create({
      packageId,
      name: dto.name,
      price: dto.price,
      quota: dto.quota,
      heldSeats: 0,
      confirmedSeats: 0,
      version: 1,
    });

    return this.tiersRepository.save(tier);
  }

  /**
   * Updates tier details with optimistic concurrency locking and quota validation.
   * If version mismatch -> 409 CONFLICT.
   */
  async update(id: string, dto: UpdateTierDto): Promise<PackageTier> {
    const tier = await this.findById(id);

    if (tier.version !== dto.version) {
      throw new ConflictException(
        `Tier version mismatch: provided version ${dto.version} does not match current version ${tier.version}`,
      );
    }

    if (dto.quota !== undefined) {
      const activeSeats = tier.confirmedSeats + tier.heldSeats;
      if (dto.quota < activeSeats) {
        throw new BadRequestException(
          `Quota (${dto.quota}) cannot be reduced below current active seats (${activeSeats}: ${tier.confirmedSeats} confirmed + ${tier.heldSeats} held)`,
        );
      }
      tier.quota = dto.quota;
    }

    if (dto.name !== undefined) tier.name = dto.name;
    if (dto.price !== undefined) tier.price = dto.price;

    return this.tiersRepository.save(tier);
  }
}
