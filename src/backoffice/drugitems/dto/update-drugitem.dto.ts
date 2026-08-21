import { PartialType } from '@nestjs/mapped-types';
import { CreateDrugitemDto } from './create-drugitem.dto';

export class UpdateDrugitemDto extends PartialType(CreateDrugitemDto) {}
