import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class RequestCancellationDto {
  @IsNotEmpty()
  @IsUUID()
  booking_id: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  pilgrim_ids?: string[];

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cancellation_fee?: number;
}
