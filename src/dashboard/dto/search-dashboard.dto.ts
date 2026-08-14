import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchDashboardDto {
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
