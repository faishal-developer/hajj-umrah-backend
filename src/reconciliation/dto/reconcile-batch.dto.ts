import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SettlementItemDto {
  @ApiProperty({
    description: 'Unique gateway transaction or settlement identifier',
    example: 'TRX-BKASH-883921',
  })
  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @ApiProperty({
    description: 'Settled amount reported by the gateway',
    example: 50000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description: 'Settlement currency ISO code',
    example: 'BDT',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Date/time string of the settlement report',
    example: '2026-06-01T12:00:00Z',
  })
  @IsOptional()
  @IsString()
  settlement_date?: string;
}

export class ReconcileBatchDto {
  @ApiProperty({
    description: 'Gateway provider being reconciled (e.g. BKASH, SSLCOMMERZ, NAGAD)',
    example: 'BKASH',
  })
  @IsNotEmpty()
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Batch of settlement line items exported from payment provider',
    type: [SettlementItemDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Settlements batch must contain at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => SettlementItemDto)
  settlements: SettlementItemDto[];
}
