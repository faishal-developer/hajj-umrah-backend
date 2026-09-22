import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum.js';

export class RecordInventoryTransactionDto {
  @IsNotEmpty()
  @IsUUID()
  item_id: string;

  @IsNotEmpty()
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Quantity must be greater than zero' })
  quantity: number;

  @IsOptional()
  @IsUUID()
  booking_id?: string;

  @IsOptional()
  @IsUUID()
  pilgrim_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
