import { Module } from '@nestjs/common';
import { BackofficeDashboardService } from './dashboard.service';
import { BackofficeDashboardController } from './dashboard.controller';

@Module({
  controllers: [BackofficeDashboardController],
  providers: [BackofficeDashboardService],
})
export class BackofficeDashboardModule {}
