import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PaymentMode } from '../enums/payment-mode.enum.js';
import { CreatePilgrimDto } from './create-pilgrim.dto.js';

export class CreateBookingDto {
  @ApiProperty({
    description: 'UUID of the selected package tier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  tier_id: string;

  @ApiProperty({
    description: 'Payment mode: FULL or INSTALLMENT',
    enum: PaymentMode,
    example: PaymentMode.INSTALLMENT,
  })
  @IsNotEmpty()
  @IsEnum(PaymentMode)
  payment_mode: PaymentMode;

  @ApiProperty({
    description: 'List of pilgrims included in this booking',
    type: [CreatePilgrimDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Booking must contain at least 1 pilgrim' })
  @ValidateNested({ each: true })
  @Type(() => CreatePilgrimDto)
  pilgrims: CreatePilgrimDto[];
}
