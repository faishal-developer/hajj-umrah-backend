import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelPilgrimDto {
  @ApiPropertyOptional({
    description: 'Reason for cancelling the individual pilgrim',
    example: 'Visa application rejected',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
