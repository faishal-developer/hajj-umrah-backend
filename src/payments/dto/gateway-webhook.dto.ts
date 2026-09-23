import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum.js';

export class GatewayWebhookDto {
  @ApiPropertyOptional({
    description: 'Unique gateway notification or event identifier',
    example: 'evt_987654321',
  })
  @IsOptional()
  @IsString()
  event_id?: string;

  @ApiPropertyOptional({
    description: 'Unique gateway notification or event identifier (camelCase alias)',
    example: 'evt_987654321',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'Gateway settlement transaction reference',
    example: 'TRX_SSL_8839201',
  })
  @ValidateIf((o: GatewayWebhookDto) => !o.transactionId)
  @IsNotEmpty({ message: 'transaction_id or transactionId is required' })
  @IsString()
  transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Gateway settlement transaction reference (camelCase alias)',
    example: 'TRX_SSL_8839201',
  })
  @ValidateIf((o: GatewayWebhookDto) => !o.transaction_id)
  @IsNotEmpty({ message: 'transactionId or transaction_id is required' })
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    description: 'Internal payment record UUID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ValidateIf(
    (o: GatewayWebhookDto) =>
      !o.paymentId && !o.booking_id && !o.bookingId,
  )
  @IsNotEmpty({
    message: 'payment_id, paymentId, booking_id, or bookingId is required',
  })
  @IsString()
  payment_id?: string;

  @ApiPropertyOptional({
    description: 'Internal payment record UUID (camelCase alias)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ValidateIf(
    (o: GatewayWebhookDto) =>
      !o.payment_id && !o.booking_id && !o.bookingId,
  )
  @IsNotEmpty({
    message: 'paymentId, payment_id, booking_id, or bookingId is required',
  })
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional({
    description: 'Associated booking UUID',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsString()
  booking_id?: string;

  @ApiPropertyOptional({
    description: 'Associated booking UUID (camelCase alias)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({
    description:
      'Webhook event classification (e.g. payment.success, charge.failed)',
    example: 'payment.success',
  })
  @IsOptional()
  @IsString()
  event_type?: string;

  @ApiPropertyOptional({
    description:
      'Webhook event classification (camelCase alias)',
    example: 'payment.success',
  })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiProperty({
    description: 'Amount successfully transacted in BDT',
    example: 50000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Transaction currency ISO code',
    example: 'BDT',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Terminal payment status reported by gateway',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCESS,
  })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'HMAC signature for webhook integrity verification',
    example: 'sha256=d3b07384d113edec49eaa6238ad5ff00',
  })
  @IsOptional()
  @IsString()
  signature?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata payload delivered from gateway',
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
