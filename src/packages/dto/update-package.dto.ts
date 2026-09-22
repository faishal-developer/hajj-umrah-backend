import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  departure_date?: string;

  @IsOptional()
  @IsDateString()
  booking_start_date?: string;

  @IsOptional()
  @IsDateString()
  booking_end_date?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;
}
