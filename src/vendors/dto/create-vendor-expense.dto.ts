import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateVendorExpenseDto {
  @IsNotEmpty()
  @IsUUID()
  vendor_id: string;

  @IsOptional()
  @IsUUID()
  package_id?: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string; // e.g. SAR, USD, BDT

  @IsOptional()
  @IsNumber()
  @IsPositive()
  exchange_rate?: number; // e.g. 32.50 for SAR->BDT, default 1.0

  @IsNotEmpty()
  @IsString()
  payment_date: string;

  @IsOptional()
  @IsString()
  payment_reference?: string;
}
