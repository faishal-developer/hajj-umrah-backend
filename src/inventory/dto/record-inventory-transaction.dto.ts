import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'UUID of the inventory item',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty()
  @IsUUID()
  item_id: string;

  @ApiProperty({
    description: 'Transaction category: PURCHASE, ISSUE, RETURN, ADJUSTMENT',
    enum: InventoryTransactionType,
    example: InventoryTransactionType.ISSUE,
  })
  @IsNotEmpty()
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @ApiProperty({
    description: 'Quantity of items in this transaction',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive({ message: 'Quantity must be greater than zero' })
  quantity: number;

  @ApiPropertyOptional({
    description: 'Associated booking UUID (required for ISSUE transactions to pilgrims)',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID()
  booking_id?: string;

  @ApiPropertyOptional({
    description: 'Associated individual pilgrim UUID',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsOptional()
  @IsUUID()
  pilgrim_id?: string;

  @ApiPropertyOptional({
    description: 'Operational notes or distribution comments',
    example: 'Issued during orientation session at Dhaka office',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
