import { PartialType } from '@nestjs/mapped-types';
import { CreateDrugitemdetailDto } from './create-drugitemdetail.dto';

export class UpdateDrugitemdetailDto extends PartialType(CreateDrugitemdetailDto) {}
