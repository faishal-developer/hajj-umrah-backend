import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RequestCancellationDto {
  @ApiProperty({
    description: 'UUID of the booking to cancel',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @ApiPropertyOptional({
    description: 'Specific pilgrim UUIDs to cancel (omit for full booking cancellation)',
    example: ['f47ac10b-58cc-4372-a567-0e02b2c3d479'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  pilgrim_ids?: string[];

  @ApiPropertyOptional({
    description: 'Reason for requesting cancellation',
    example: 'Medical emergency prevents participation',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Optional admin cancellation penalty fee deducted from eligible refund',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  cancellation_fee?: number;
}
