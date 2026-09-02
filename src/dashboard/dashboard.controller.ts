import { Controller, Get, Query, Param, Delete } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

import { SearchDashboardDto } from './dto/search-dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('totalDrugHOSxP')
  findTotalDrugHOSxP() {
    return this.dashboardService.findTotalDrugHOSxP();
  }

  @Get('totalDrugHOSxP_PCU')
  findTotalDrugHOSxP_PCU() {
    return this.dashboardService.findTotalDrugHOSxP_PCU();
  }

  @Get('totalStockOutTodayHOSxP')
  findTotalStockOutTodayHOSxP() {
    return this.dashboardService.findTotalStockOutTodayHOSxP();
  }

  @Get('totalStockOutTodayHOSxP_PCU')
  findTotalStockOutTodayHOSxP_PCU() {
    return this.dashboardService.findTotalStockOutTodayHOSxP_PCU();
  }

  @Get('tbvalue')
  findTotalBValue() {
    return this.dashboardService.findTotalBvalue();
  }

  @Get('TopTenttr')
  findTopTenTTR(@Query() dto: SearchDashboardDto) {
    return this.dashboardService.findTopTenTTR(dto);
  }

  @Get('TopTentr')
  findTopTenTR(@Query() dto: SearchDashboardDto) {
    return this.dashboardService.findTopTenTR(dto);
  }

  @Get('Dvaluemonthly')
  findDvaluemonthly(@Query() dto: SearchDashboardDto) {
    return this.dashboardService.findDvaluemonthly(dto);
  }

  @Get('Remainvaluemonthly')
  findRemainvalueMonthly(@Query() dto: SearchDashboardDto) {
    return this.dashboardService.findRemainvalueMonthly(dto);
  }

  @Get('Rvaluemonthly')
  findRvalueMonthly(@Query() dto: SearchDashboardDto) {
    return this.dashboardService.findRvalueMonthly(dto);
  }


  @Get('MonthlyMedicineStock')
  findMonthlyMedicineStock(@Query() dto:SearchDashboardDto){
    return this.dashboardService.findMonthlyMedicineStock(dto);
  }

  @Get()
  findAll() {
    return this.dashboardService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dashboardService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dashboardService.remove(+id);
  }
}
