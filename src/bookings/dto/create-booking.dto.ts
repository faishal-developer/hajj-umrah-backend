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
  @IsNotEmpty()
  @IsUUID()
  tier_id: string;

  @IsNotEmpty()
  @IsEnum(PaymentMode)
  payment_mode: PaymentMode;

  @IsArray()
  @ArrayMinSize(1, { message: 'Booking must contain at least 1 pilgrim' })
  @ValidateNested({ each: true })
  @Type(() => CreatePilgrimDto)
  pilgrims: CreatePilgrimDto[];
}
