import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BackofficeDashboardService } from './dashboard.service';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { SearchDashboardDto } from './dto/seach-dashboard.dto';

@Controller('backoffice/dashboard')
export class BackofficeDashboardController {
  constructor(private readonly backofficeDashboardService: BackofficeDashboardService) {}

  @Post()
  create(@Body() createDashboardDto: CreateDashboardDto) {
    return this.backofficeDashboardService.create(createDashboardDto);
  }

  @Get('totalbalance/:icode')
  findBalanceByIcode(@Param('icode') icode:string) {
    return this.backofficeDashboardService.findBalanceByIcode(icode);
  }

  
  @Get('carry')
  findCarry(@Query() dto:SearchDashboardDto) {
    return this.backofficeDashboardService.findCarry(dto);
  }

  @Get('import')
  findImport(@Query() dto:SearchDashboardDto) {
    return this.backofficeDashboardService.findImport(dto);
  }
  @Get('exportHosxp')
  findExportHosxP(@Query() dto:SearchDashboardDto) {
    return this.backofficeDashboardService.findExportHosxP(dto);
  }
  
  @Get('export')
  findExport(@Query() dto:SearchDashboardDto) {
    return this.backofficeDashboardService.findExport(dto);
  }



  @Get('balance')
  findBalance(@Query() dto:SearchDashboardDto){
    return this.backofficeDashboardService.findBalance(dto);
  }

  // @Get('exportByHosxP')
  // findExportByHosxP(@Body() dto:SearchDashboardDto) {
  //   return this.backofficeDashboardService.findExportByHosxP(dto);
  // }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.backofficeDashboardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDashboardDto: UpdateDashboardDto) {
    return this.backofficeDashboardService.update(+id, updateDashboardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.backofficeDashboardService.remove(+id);
  }
}
