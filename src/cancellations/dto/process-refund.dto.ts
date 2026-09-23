import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RefundStatus } from '../enums/refund-status.enum.js';

export class ProcessRefundDto {
  @ApiProperty({
    description: 'New refund state (PROCESSING, COMPLETED, or REJECTED)',
    enum: RefundStatus,
    example: RefundStatus.COMPLETED,
  })
  @IsNotEmpty()
  @IsEnum(RefundStatus)
  status: RefundStatus;

  @ApiPropertyOptional({
    description: 'Bank or gateway disbursement reference code',
    example: 'BNK-REF-2026-9901',
  })
  @IsOptional()
  @IsString()
  transaction_reference?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection or processing note',
    example: 'Disbursement transferred to customer account via BEFTN',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
