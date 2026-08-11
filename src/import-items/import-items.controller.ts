import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors,UploadedFile} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportItemsService } from './import-items.service';
import { CreateImportItemDto } from './dto/create-import-item.dto';
import { UpdateImportItemDto } from './dto/update-import-item.dto';

@Controller('import')
export class ImportItemsController {
  constructor(private readonly importItemsService: ImportItemsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    return this.importItemsService.upload(file.buffer);
  }

  @Get()
  findAll() {
    return this.importItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.importItemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateImportItemDto: UpdateImportItemDto) {
    return this.importItemsService.update(+id, updateImportItemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.importItemsService.remove(+id);
  }
}
