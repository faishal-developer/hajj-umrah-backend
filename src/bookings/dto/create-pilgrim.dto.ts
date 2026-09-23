import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePilgrimDto {
  @ApiProperty({
    description: 'Full name of the pilgrim',
    example: 'Abdullah Khan',
    maxLength: 150,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Passport number of the pilgrim',
    example: 'A12345678',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  passport_number: string;

  @ApiPropertyOptional({
    description: 'Nationality of the pilgrim',
    example: 'Bangladeshi',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (YYYY-MM-DD)',
    example: '1985-06-15',
  })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({
    description: 'Passport expiry date (YYYY-MM-DD)',
    example: '2030-01-01',
  })
  @IsOptional()
  @IsDateString()
  passport_expiry?: string;
}
