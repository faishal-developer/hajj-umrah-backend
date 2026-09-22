import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePackageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  departure_date: string;

  @IsNotEmpty()
  @IsDateString()
  booking_start_date: string;

  @IsNotEmpty()
  @IsDateString()
  booking_end_date: string;
}
