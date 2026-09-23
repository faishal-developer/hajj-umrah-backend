import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class RecordManualPaymentDto {
  @ApiProperty({
    description: 'UUID of the booking',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @ApiProperty({
    description: 'Amount received in BDT',
    example: 100000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    description: 'Manual collection method (e.g. CASH, BANK_TRANSFER, CHEQUE)',
    example: 'BANK_TRANSFER',
  })
  @IsNotEmpty()
  @IsString()
  method: string;

  @ApiPropertyOptional({
    description: 'Bank slip or cheque reference number',
    example: 'BANK-CHQ-987654',
  })
  @IsOptional()
  @IsString()
  reference_number?: string;

  @ApiPropertyOptional({
    description: 'Internal audit or verification notes',
    example: 'Deposit confirmed at Sonali Bank Gulshan branch.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
