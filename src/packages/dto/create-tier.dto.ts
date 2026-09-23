import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTierDto {
  @ApiProperty({
    description: 'Name of the package tier (e.g. VIP, Economy, Standard)',
    example: 'VIP Gold',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Price per seat in BDT',
    example: 750000,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'Total seat capacity allocated to this tier',
    example: 50,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  quota: number;
}
