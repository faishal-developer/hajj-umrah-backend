import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReconciliationStatus } from '../enums/reconciliation-status.enum.js';

export class ResolveReconciliationDto {
  @ApiProperty({
    description: 'Updated investigation status (UNDER_REVIEW or RESOLVED)',
    enum: ReconciliationStatus,
    example: ReconciliationStatus.RESOLVED,
  })
  @IsNotEmpty()
  @IsEnum(ReconciliationStatus)
  status: ReconciliationStatus;

  @ApiPropertyOptional({
    description: 'Investigation notes, resolution details, or adjustment justifications',
    example: 'Discrepancy resolved: Gateway fee of 1.5% was deducted prior to settlement batching.',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
