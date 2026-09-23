import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({
    description: 'UUID of the booking to pay for',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @ApiProperty({
    description: 'Payment amount in BDT',
    example: 50000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @ApiProperty({
    description: 'Gateway provider name (e.g. SSLCOMMERZ, BKASH, NAGAD, STRIPE)',
    example: 'SSLCOMMERZ',
  })
  @IsNotEmpty()
  @IsString()
  provider: string;

  @ApiPropertyOptional({
    description: 'Payment method channel (e.g. CARD, WALLET, NET_BANKING)',
    example: 'CARD',
  })
  @IsOptional()
  @IsString()
  method?: string;
}
