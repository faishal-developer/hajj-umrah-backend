import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { PaymentMode } from '../enums/payment-mode.enum.js';
import { CreatePilgrimDto } from './create-pilgrim.dto.js';

export class CreateBookingDto {
  @ApiPropertyOptional({
    description: 'UUID of the package (optional client reference)',
    example: 'ff9cec36-4876-4eda-b5d0-7ab43ed00119',
  })
  @IsOptional()
  @IsUUID()
  packageId?: string;

  @ApiPropertyOptional({
    description: 'UUID of the package (snake_case alias)',
    example: 'ff9cec36-4876-4eda-b5d0-7ab43ed00119',
  })
  @IsOptional()
  @IsUUID()
  package_id?: string;

  @ApiPropertyOptional({
    description: 'UUID of the selected package tier',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ValidateIf((o: CreateBookingDto) => !o.tierId)
  @IsNotEmpty({ message: 'tier_id or tierId is required' })
  @IsUUID()
  tier_id?: string;

  @ApiPropertyOptional({
    description: 'UUID of the selected package tier (camelCase alias)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ValidateIf((o: CreateBookingDto) => !o.tier_id)
  @IsNotEmpty({ message: 'tierId or tier_id is required' })
  @IsUUID()
  tierId?: string;

  @ApiPropertyOptional({
    description: 'Payment mode: FULL or INSTALLMENT',
    enum: PaymentMode,
    example: PaymentMode.INSTALLMENT,
  })
  @ValidateIf((o: CreateBookingDto) => !o.paymentMode)
  @IsNotEmpty({ message: 'payment_mode or paymentMode is required' })
  @IsEnum(PaymentMode)
  payment_mode?: PaymentMode;

  @ApiPropertyOptional({
    description: 'Payment mode: FULL or INSTALLMENT (camelCase alias)',
    enum: PaymentMode,
    example: PaymentMode.INSTALLMENT,
  })
  @ValidateIf((o: CreateBookingDto) => !o.payment_mode)
  @IsNotEmpty({ message: 'paymentMode or payment_mode is required' })
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

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

