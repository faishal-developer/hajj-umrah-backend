import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelBookingDto {
  @ApiPropertyOptional({
    description: 'Reason for cancelling the booking',
    example: 'Health emergency preventing travel',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
