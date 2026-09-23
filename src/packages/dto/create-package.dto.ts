import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePackageDto {
  @ApiProperty({
    description: 'Name of the Hajj or Umrah package',
    example: 'Executive Hajj Package 2026',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Package type: HAJJ or UMRAH',
    example: 'HAJJ',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  type: string;

  @ApiPropertyOptional({
    description: 'Detailed package description',
    example: 'Includes 5-star hotel accommodations in Makkah and Madinah with full VIP transport.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Scheduled departure date (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsNotEmpty()
  @IsDateString()
  departure_date: string;

  @ApiProperty({
    description: 'Booking opening date (YYYY-MM-DD)',
    example: '2026-01-01',
  })
  @IsNotEmpty()
  @IsDateString()
  booking_start_date: string;

  @ApiProperty({
    description: 'Booking closing date (YYYY-MM-DD)',
    example: '2026-05-15',
  })
  @IsNotEmpty()
  @IsDateString()
  booking_end_date: string;
}
