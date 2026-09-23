import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({
    description: 'Corporate or trade name of the vendor',
    example: 'Makkah Clock Royal Hotel Co.',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Vendor operational category (HOTEL, TRANSPORT, AIRLINE, VISA, CATERING, OTHER)',
    example: 'HOTEL',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: 'Default billing currency code (e.g. SAR, USD, BDT)',
    example: 'SAR',
    default: 'SAR',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Primary contact person or account representative',
    example: 'Sheikh Tariq Al-Mansoor',
  })
  @IsOptional()
  @IsString()
  contact_person?: string;

  @ApiPropertyOptional({
    description: 'Vendor contact phone number',
    example: '+966125000000',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Vendor official email',
    example: 'reservations@clockroyal.sa',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Vendor registered physical address',
    example: 'Abraj Al Bait Complex, King Abdul Aziz Endowment, Makkah',
  })
  @IsOptional()
  @IsString()
  address?: string;
}
