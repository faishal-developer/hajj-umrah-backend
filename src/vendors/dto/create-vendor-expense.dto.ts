import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVendorExpenseDto {
  @ApiProperty({
    description: 'UUID of the vendor associated with this expense',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  vendor_id: string;

  @ApiPropertyOptional({
    description: 'Optional package UUID if expense directly pertains to a package cohort',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID()
  package_id?: string;

  @ApiProperty({
    description: 'Detailed description of the expense item',
    example: '50 VIP room bookings for 10 nights at Makkah Clock Royal Hotel',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Expense amount in original invoicing currency',
    example: 250000,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    description: 'Currency ISO code (e.g. SAR, USD, BDT)',
    example: 'SAR',
  })
  @IsNotEmpty()
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    description: 'Foreign exchange rate against BDT (e.g. 32.50 for SAR -> BDT)',
    example: 32.5,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchange_rate?: number;

  @ApiProperty({
    description: 'Payment date (YYYY-MM-DD)',
    example: '2026-06-01',
  })
  @IsNotEmpty()
  @IsString()
  payment_date: string;

  @ApiPropertyOptional({
    description: 'Bank swift or remittance invoice reference',
    example: 'SWIFT-SAR-998811',
  })
  @IsOptional()
  @IsString()
  payment_reference?: string;
}
