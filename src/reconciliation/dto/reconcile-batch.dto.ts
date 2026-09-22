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
  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  settlement_date?: string;
}

export class ReconcileBatchDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Settlements batch must contain at least 1 item' })
  @ValidateNested({ each: true })
  @Type(() => SettlementItemDto)
  settlements: SettlementItemDto[];
}
