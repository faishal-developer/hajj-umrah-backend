import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class RecordManualPaymentDto {
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  method: string; // 'CASH', 'BANK_TRANSFER', 'CHEQUE', etc.

  @IsOptional()
  @IsString()
  reference_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
