import { PartialType } from '@nestjs/mapped-types';
import { CreateImportItemDto } from './create-import-item.dto';

export class UpdateImportItemDto extends PartialType(CreateImportItemDto) {}
