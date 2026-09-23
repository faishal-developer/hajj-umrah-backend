import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePackageDto {
  @ApiPropertyOptional({
    description: 'Updated name of the package',
    example: 'Executive Hajj Package 2026 - Updated',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated package type: HAJJ or UMRAH',
    example: 'HAJJ',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Includes 5-star hotel accommodations.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated departure date (YYYY-MM-DD)',
    example: '2026-06-05',
  })
  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @ApiPropertyOptional({
    description: 'Updated return date (YYYY-MM-DD)',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString()
  return_date?: string;

  @ApiPropertyOptional({
    description: 'Updated return date (camelCase alias: YYYY-MM-DD)',
    example: '2026-06-30',
  })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({
    description: 'Updated booking start date (YYYY-MM-DD)',
    example: '2026-01-05',
  })
  @IsOptional()
  @IsDateString()
  booking_start_date?: string;

  @ApiPropertyOptional({
    description: 'Updated booking end date (YYYY-MM-DD)',
    example: '2026-05-20',
  })
  @IsOptional()
  @IsDateString()
  booking_end_date?: string;

  @ApiProperty({
    description: 'Current entity version for optimistic locking',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;
}
