import { IsOptional, IsString } from 'class-validator';

export class CancelPilgrimDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
