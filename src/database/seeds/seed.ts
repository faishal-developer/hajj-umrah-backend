import 'dotenv/config';
import bcrypt from 'bcryptjs';
import AppDataSource from '../data-source.js';
import { User } from '../../users/entities/user.entity.js';
import { Package } from '../../packages/entities/package.entity.js';
import { PackageTier } from '../../packages/entities/package-tier.entity.js';
import { UserRole } from '../../users/enums/user-role.enum.js';
import { UserStatus } from '../../users/enums/user-status.enum.js';
import { PackageStatus } from '../../packages/enums/package-status.enum.js';

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected successfully.');

  const userRepo = AppDataSource.getRepository(User);
  const packageRepo = AppDataSource.getRepository(Package);
  const tierRepo = AppDataSource.getRepository(PackageTier);

  // 1. Seed Users
  console.log('Seeding users...');
  const saltRounds = 10;

  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@hajjumrah.com',
      phone: '+8801700000001',
      password: 'AdminPassword123!',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
    {
      name: 'Haji Rafiqul Islam',
      email: 'user@hajjumrah.com',
      phone: '+8801712345678',
      password: 'UserPassword123!',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
    {
      name: 'Amina Begum',
      email: 'pilgrim@hajjumrah.com',
      phone: '+8801812345678',
      password: 'PilgrimPassword123!',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  ];

  for (const u of usersData) {
    let existingUser = await userRepo.findOne({ where: { email: u.email } });
    const passwordHash = await bcrypt.hash(u.password, saltRounds);

    if (existingUser) {
      existingUser.name = u.name;
      existingUser.phone = u.phone;
      existingUser.passwordHash = passwordHash;
      existingUser.role = u.role;
      existingUser.status = u.status;
      await userRepo.save(existingUser);
      console.log(`Updated user: ${u.email} (${u.role})`);
    } else {
      const newUser = userRepo.create({
        name: u.name,
        email: u.email,
        phone: u.phone,
        passwordHash,
        role: u.role,
        status: u.status,
      });
      await userRepo.save(newUser);
      console.log(`Created user: ${u.email} (${u.role})`);
    }
  }

  // 2. Seed Packages and Tiers
  console.log('Seeding packages and tiers...');

  const packagesData = [
    {
      name: 'Executive Royal Hajj 2026 (VIP Mina Tents)',
      type: 'HAJJ',
      description:
        'All-inclusive 25-day VIP Hajj package with premium air-conditioned Mina & Arafat VIP tents near Jamarat, Swissôtel Makkah & The Oberoi Madinah stays, luxury bullet train transfers, full board gourmet meals, Qurbani included, and 24/7 dedicated Islamic scholar guidance.',
      departureDate: '2026-05-20',
      bookingStartDate: '2026-01-15',
      bookingEndDate: '2026-05-01',
      status: PackageStatus.PUBLISHED,
      tiers: [
        {
          name: 'Royal VIP (Zone A Tents + 5★ Front Haram View)',
          price: 1250000,
          quota: 40,
        },
        {
          name: 'Executive Premium (Zone B Tents + 5★ Luxury)',
          price: 950000,
          quota: 80,
        },
        {
          name: 'Deluxe Standard (Zone C Tents + 4★ Premium)',
          price: 750000,
          quota: 120,
        },
      ],
    },
    {
      name: 'Classic Hajj Economy Package 2026',
      type: 'HAJJ',
      description:
        'Affordable, complete 35-day standard Hajj package with comprehensive logistics, experienced group leader (Moallim), standard hotel accommodations near shuttle points, all meals, and medical support team.',
      departureDate: '2026-05-18',
      bookingStartDate: '2026-01-15',
      bookingEndDate: '2026-04-30',
      status: PackageStatus.PUBLISHED,
      tiers: [
        {
          name: 'Standard Double Sharing',
          price: 720000,
          quota: 50,
        },
        {
          name: 'Standard Triple Sharing',
          price: 640000,
          quota: 100,
        },
        {
          name: 'Standard Quad Sharing',
          price: 580000,
          quota: 150,
        },
      ],
    },
    {
      name: 'Premium Ramadan Umrah 2026 (Last 15 Days)',
      type: 'UMRAH',
      description:
        '15-day spiritual journey during the blessed last days of Ramadan including Laylatul Qadr and Eid in Makkah. Features 5-star hotel accommodations steps away from Haram in Makkah and Madinah, direct flights, VIP private transport, and guided Ziyarah tours.',
      departureDate: '2026-03-10',
      bookingStartDate: '2026-01-01',
      bookingEndDate: '2026-03-01',
      status: PackageStatus.PUBLISHED,
      tiers: [
        {
          name: 'Platinum VIP (Front Row Kaaba View Suite)',
          price: 450000,
          quota: 30,
        },
        {
          name: 'Gold Suite (Quad Sharing 5-Star Luxury)',
          price: 320000,
          quota: 60,
        },
        {
          name: 'Silver Economy (Standard 4-Star Walking Distance)',
          price: 220000,
          quota: 100,
        },
      ],
    },
    {
      name: 'Autumn Special 10-Day Umrah Express',
      type: 'UMRAH',
      description:
        'Compact 10-day Umrah package designed for professionals and families with tight schedules. Features 5 days in Makkah and 4 days in Madinah with buffet breakfast, luxury airport transfers, and guided tours of historical Islamic sites.',
      departureDate: '2026-10-15',
      bookingStartDate: '2026-06-01',
      bookingEndDate: '2026-10-01',
      status: PackageStatus.PUBLISHED,
      tiers: [
        {
          name: 'Executive Double (5★ Close to Haram)',
          price: 185000,
          quota: 40,
        },
        {
          name: 'Family Quad Sharing (4★ Standard)',
          price: 145000,
          quota: 80,
        },
      ],
    },
    {
      name: 'Winter Vacation Family Umrah 2026',
      type: 'UMRAH',
      description:
        'Special December holiday 14-day Umrah package for families. Includes kid-friendly excursions, interactive seminar sessions on Umrah rites, Pullman Zamzam Makkah accommodation, and Haramain High-Speed Railway travel.',
      departureDate: '2026-12-18',
      bookingStartDate: '2026-08-01',
      bookingEndDate: '2026-12-05',
      status: PackageStatus.PUBLISHED,
      tiers: [
        {
          name: 'Family Suite (Haram View 5★)',
          price: 260000,
          quota: 50,
        },
        {
          name: 'Standard Family (City View 4★)',
          price: 195000,
          quota: 100,
        },
      ],
    },
  ];

  for (const pkgData of packagesData) {
    let pkg = await packageRepo.findOne({
      where: { name: pkgData.name },
      relations: { tiers: true },
    });

    if (!pkg) {
      pkg = packageRepo.create({
        name: pkgData.name,
        type: pkgData.type,
        description: pkgData.description,
        departureDate: pkgData.departureDate,
        bookingStartDate: pkgData.bookingStartDate,
        bookingEndDate: pkgData.bookingEndDate,
        status: pkgData.status,
        version: 1,
      });
      pkg = await packageRepo.save(pkg);
      console.log(`Created package: "${pkg.name}" (${pkg.id})`);
    } else {
      pkg.type = pkgData.type;
      pkg.description = pkgData.description;
      pkg.departureDate = pkgData.departureDate;
      pkg.bookingStartDate = pkgData.bookingStartDate;
      pkg.bookingEndDate = pkgData.bookingEndDate;
      pkg.status = pkgData.status;
      pkg = await packageRepo.save(pkg);
      console.log(`Updated package: "${pkg.name}" (${pkg.id})`);
    }

    // Seed tiers for this package
    for (const tierData of pkgData.tiers) {
      let tier = await tierRepo.findOne({
        where: { packageId: pkg.id, name: tierData.name },
      });

      if (!tier) {
        tier = tierRepo.create({
          packageId: pkg.id,
          name: tierData.name,
          price: tierData.price,
          quota: tierData.quota,
          heldSeats: 0,
          confirmedSeats: 0,
          version: 1,
        });
        await tierRepo.save(tier);
        console.log(`  - Created tier: "${tier.name}" - BDT ${tier.price.toLocaleString()} (Quota: ${tier.quota})`);
      } else {
        tier.price = tierData.price;
        tier.quota = tierData.quota;
        await tierRepo.save(tier);
        console.log(`  - Updated tier: "${tier.name}" - BDT ${tier.price.toLocaleString()} (Quota: ${tier.quota})`);
      }
    }
  }

  console.log('Seeding completed successfully!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
