import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({
    description: 'Unique Stock Keeping Unit identifier (e.g. IHRAM-MALE, BAG-WHEEL, SIM-STC)',
    example: 'IHRAM-MALE',
  })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Item display name',
    example: 'Premium Cotton Ihram Set (Male)',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Item category (e.g. APPAREL, LUGGAGE, TELECOM, OTHER)',
    example: 'APPAREL',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Initial stock quantity to populate on creation',
    example: 500,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  initial_stock?: number;

  @ApiPropertyOptional({
    description: 'Unit cost price in BDT',
    example: 2500,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  unit_cost?: number;
}
