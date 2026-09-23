import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReturnDateAndBookingIndexes1710000000001 implements MigrationInterface {
  name = 'AddReturnDateAndBookingIndexes1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add return_date to packages if not exists
    await queryRunner.query(`
      ALTER TABLE packages 
      ADD COLUMN IF NOT EXISTS return_date DATE;
    `);

    // 2. Add composite index on packages for published and active query
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_packages_status_booking_dates 
      ON packages (status, booking_end_date, departure_date);
    `);

    // 3. Add index on booking_pilgrims for passport_number lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_booking_pilgrims_passport 
      ON booking_pilgrims (passport_number, status);
    `);

    // 4. Add index on bookings for active expiration sweeping
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status_expires 
      ON bookings (status, expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_bookings_status_expires;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_booking_pilgrims_passport;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_packages_status_booking_dates;`);
    await queryRunner.query(`ALTER TABLE packages DROP COLUMN IF EXISTS return_date;`);
  }
}
