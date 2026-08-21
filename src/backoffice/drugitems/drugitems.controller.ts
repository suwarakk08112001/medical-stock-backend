import { Controller, Get, Post, Body, Query, Patch, Param, Delete } from '@nestjs/common';
import { DrugitemsService } from './drugitems.service';
import { CreateDrugitemDto } from './dto/create-drugitem.dto';
import { UpdateDrugitemDto } from './dto/update-drugitem.dto';
import { PaginationDrugitemDto } from './dto/paginate-drugitem.dto';

@Controller('backoffice/drugitems')
export class DrugitemsController {
  constructor(private readonly drugitemsService: DrugitemsService) {}

  @Post()
  create(@Body() createDrugitemDto: CreateDrugitemDto) {
    return this.drugitemsService.create(createDrugitemDto);
  }

  @Get('all')
  findAll() {
    return this.drugitemsService.findAll();
  }

  @Get()
  findMany(@Query() dto:PaginationDrugitemDto) {
    return this.drugitemsService.findMany(dto);
  }
  
  

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drugitemsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDrugitemDto: UpdateDrugitemDto) {
    return this.drugitemsService.update(+id, updateDrugitemDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.drugitemsService.remove(+id);
  }
}
