import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string; // HOTEL, TRANSPORT, AIRLINE, VISA, CATERING, OTHER

  @IsOptional()
  @IsString()
  currency?: string; // Default SAR

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
