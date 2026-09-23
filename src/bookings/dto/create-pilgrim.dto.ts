import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreatePilgrimDto {
  @ApiPropertyOptional({
    description: 'Full name of the pilgrim (name alias)',
    example: 'Abdullah Khan',
    maxLength: 150,
  })
  @ValidateIf((o: CreatePilgrimDto) => !o.fullName && !o.full_name)
  @IsNotEmpty({ message: 'name or fullName is required' })
  @IsString()
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({
    description: 'Full name of the pilgrim (camelCase alias)',
    example: 'Abdullah Khan',
    maxLength: 150,
  })
  @ValidateIf((o: CreatePilgrimDto) => !o.name && !o.full_name)
  @IsNotEmpty({ message: 'fullName or name is required' })
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({
    description: 'Full name of the pilgrim (snake_case alias)',
    example: 'Abdullah Khan',
    maxLength: 150,
  })
  @ValidateIf((o: CreatePilgrimDto) => !o.name && !o.fullName)
  @IsNotEmpty({ message: 'full_name or fullName is required' })
  @IsString()
  @MaxLength(150)
  full_name?: string;

  @ApiPropertyOptional({
    description: 'Passport number of the pilgrim',
    example: 'A12345678',
    maxLength: 100,
  })
  @ValidateIf((o: CreatePilgrimDto) => !o.passportNumber)
  @IsNotEmpty({ message: 'passport_number or passportNumber is required' })
  @IsString()
  @MaxLength(100)
  passport_number?: string;

  @ApiPropertyOptional({
    description: 'Passport number of the pilgrim (camelCase alias)',
    example: 'A12345678',
    maxLength: 100,
  })
  @ValidateIf((o: CreatePilgrimDto) => !o.passport_number)
  @IsNotEmpty({ message: 'passportNumber or passport_number is required' })
  @IsString()
  @MaxLength(100)
  passportNumber?: string;

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
    description: 'Date of birth (camelCase alias: YYYY-MM-DD)',
    example: '1985-06-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Passport expiry date (YYYY-MM-DD)',
    example: '2030-01-01',
  })
  @IsOptional()
  @IsDateString()
  passport_expiry?: string;

  @ApiPropertyOptional({
    description: 'Passport expiry date (camelCase alias: YYYY-MM-DD)',
    example: '2030-01-01',
  })
  @IsOptional()
  @IsDateString()
  passportExpiry?: string;
}

