import { Controller, Get, Post, Body, Query, Patch, Param, Delete } from '@nestjs/common';
import { DrugitemdetailsService } from './drugitemdetails.service';
import { CreateDrugitemdetailDto } from './dto/create-drugitemdetail.dto';
import { UpdateDrugitemdetailDto } from './dto/update-drugitemdetail.dto';
import { SearchDrugItemDetailsDto } from './dto/seach-drugitemdetail.dto';

@Controller('drugitemdetails')
export class DrugitemdetailsController {
  constructor(private readonly drugitemdetailsService: DrugitemdetailsService) {}

  @Get('totalStockHOS/:drugItemCodeId')
  findTotalStockHOS(@Param('drugItemCodeId') drugItemCodeId:number) {
    return this.drugitemdetailsService.findTotalStockHOS(drugItemCodeId);
  }

  @Get('totalbalance/:drugItemCodeId')
  findBalanceByDrugItemCodeId(@Param('drugItemCodeId') drugItemCodeId:number) {
    return this.drugitemdetailsService.findBalanceByDrugItemCodeId(drugItemCodeId);
  }

  
  @Get('totalStockOutTodayHOSxP/:icode')
  findTotalStockOutTodayHOSxPByIcode(@Param('icode') icode: string) {
    return this.drugitemdetailsService.findTotalStockOutTodayHOSxPByIcode(icode);
  }

  @Get('totalStockOutTodayHOSxP_PCU/:icode')
  findTotalStockOutTodayHOSxP_PCUPByIcode(@Param('icode') icode: string) {
    return this.drugitemdetailsService.findTotalStockOutTodayHOSxP_PCUByIcode(icode);
  }


  @Get('carry')
  findCarry(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findCarry(dto);
  }

  @Get('import')
  findImport(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findImport(dto);
  }
  @Get('exportHosxp')
  findExportHosxP(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findExportHosxP(dto);
  }

  @Get('exportHosxpPCU')
  findExportHosxpPCU(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findExportHosxpPCU(dto);
  }

  @Get('export')
  findExport(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findExport(dto);
  }

  @Get('balance')
  findBalance(@Query() dto: SearchDrugItemDetailsDto) {
    return this.drugitemdetailsService.findBalance(dto);
  }
}
