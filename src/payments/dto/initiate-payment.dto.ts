import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;

  @IsNotEmpty()
  @IsString()
  provider: string; // e.g., 'BKASH', 'NAGAD', 'SSLCOMMERZ', 'STRIPE'

  @IsOptional()
  @IsString()
  method?: string; // e.g., 'WALLET', 'CARD', 'NET_BANKING'
}
