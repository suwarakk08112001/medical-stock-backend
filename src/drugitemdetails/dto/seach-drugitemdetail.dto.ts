import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDrugItemDetailsDto {
  @IsOptional()
  @IsString()
  icode!: string;

  @IsNotEmpty()
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  financialYear?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;
}
