import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTierDto {
  @ApiPropertyOptional({
    description: 'Updated name of the tier',
    example: 'VIP Platinum',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated seat price in BDT',
    example: 800000,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({
    description: 'Updated total quota (must not be lower than active held + confirmed seats)',
    example: 60,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  quota?: number;

  @ApiProperty({
    description: 'Current entity version for optimistic locking',
    example: 1,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  version: number;
}
