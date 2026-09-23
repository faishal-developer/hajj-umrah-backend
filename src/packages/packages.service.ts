import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './entities/package.entity.js';
import { PackageStatus } from './enums/package-status.enum.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { QueryPackageDto } from './dto/query-package.dto.js';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packagesRepository: Repository<Package>,
  ) {}

  /**
   * Retrieves list of published packages visible to public users / pilgrims.
   */
  async findPublished(query: QueryPackageDto = {}): Promise<Package[]> {
    const { page = 1, limit = 20, type } = query;
    const qb = this.packagesRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.tiers', 'tiers')
      .where('package.status = :status', { status: PackageStatus.PUBLISHED });

    if (type) {
      qb.andWhere('package.type = :type', { type });
    }

    return qb
      .orderBy('package.departureDate', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  /**
   * Retrieves all packages (Admin only).
   */
  async findAll(query: QueryPackageDto = {}): Promise<Package[]> {
    const { page = 1, limit = 20, type } = query;
    const qb = this.packagesRepository
      .createQueryBuilder('package')
      .leftJoinAndSelect('package.tiers', 'tiers');

    if (type) {
      qb.where('package.type = :type', { type });
    }

    return qb
      .orderBy('package.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();
  }

  /**
   * Retrieves package by ID with available tiers.
   */
  async findById(id: string, publishedOnly = false): Promise<Package> {
    const pkg = await this.packagesRepository.findOne({
      where: { id },
      relations: { tiers: true },
    });

    if (!pkg) {
      throw new NotFoundException(`Package with ID "${id}" not found`);
    }

    if (publishedOnly && pkg.status !== PackageStatus.PUBLISHED) {
      throw new NotFoundException(`Package with ID "${id}" not found`);
    }

    return pkg;
  }

  /**
   * Creates a new package in DRAFT status.
   */
  async create(dto: CreatePackageDto): Promise<Package> {
    const pkg = this.packagesRepository.create({
      name: dto.name,
      type: dto.type,
      description: dto.description || null,
      departureDate: dto.departure_date,
      bookingStartDate: dto.booking_start_date,
      bookingEndDate: dto.booking_end_date,
      status: PackageStatus.DRAFT,
      version: 1,
    });

    return this.packagesRepository.save(pkg);
  }

  /**
   * Updates package details with optimistic concurrency locking.
   * If version mismatch -> 409 CONFLICT.
   */
  async update(id: string, dto: UpdatePackageDto): Promise<Package> {
    const pkg = await this.findById(id);

    if (pkg.version !== dto.version) {
      throw new ConflictException(
        `Package version mismatch: provided version ${dto.version} does not match current version ${pkg.version}`,
      );
    }

    if (dto.name !== undefined) pkg.name = dto.name;
    if (dto.type !== undefined) pkg.type = dto.type;
    if (dto.description !== undefined) pkg.description = dto.description;
    if (dto.departure_date !== undefined) pkg.departureDate = dto.departure_date;
    if (dto.booking_start_date !== undefined) pkg.bookingStartDate = dto.booking_start_date;
    if (dto.booking_end_date !== undefined) pkg.bookingEndDate = dto.booking_end_date;

    return this.packagesRepository.save(pkg);
  }

  /**
   * Publishes a package making it visible to users.
   */
  async publish(id: string): Promise<Package> {
    const pkg = await this.findById(id);
    pkg.status = PackageStatus.PUBLISHED;
    return this.packagesRepository.save(pkg);
  }

  /**
   * Archives a package.
   */
  async archive(id: string): Promise<Package> {
    const pkg = await this.findById(id);
    pkg.status = PackageStatus.ARCHIVED;
    return this.packagesRepository.save(pkg);
  }
}
