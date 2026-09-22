import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum.js';

export class GatewayWebhookDto {
  @IsOptional()
  @IsString()
  event_id?: string;

  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @IsNotEmpty()
  @IsString()
  payment_id: string;

  @IsOptional()
  @IsString()
  booking_id?: string;

  @IsOptional()
  @IsString()
  event_type?: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
