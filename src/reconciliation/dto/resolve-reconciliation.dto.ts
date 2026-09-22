import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReconciliationStatus } from '../enums/reconciliation-status.enum.js';

export class ResolveReconciliationDto {
  @IsNotEmpty()
  @IsEnum(ReconciliationStatus)
  status: ReconciliationStatus; // UNDER_REVIEW or RESOLVED

  @IsOptional()
  @IsString()
  notes?: string;
}
