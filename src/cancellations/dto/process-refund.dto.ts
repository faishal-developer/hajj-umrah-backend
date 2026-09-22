import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RefundStatus } from '../enums/refund-status.enum.js';

export class ProcessRefundDto {
  @IsNotEmpty()
  @IsEnum(RefundStatus)
  status: RefundStatus; // PROCESSING, COMPLETED, or REJECTED

  @IsOptional()
  @IsString()
  transaction_reference?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
