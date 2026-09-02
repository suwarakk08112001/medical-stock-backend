import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DrugitemsModule } from './drugitems/drugitems.module';
import { ImportItemsModule } from './import-items/import-items.module';

import { ScheduleModule } from '@nestjs/schedule';
import { BackofficeScheduleModule } from './schedule/schedule.module';
import { StocksModule } from './stocks/stocks.module';
import { DrugitemdetailsModule } from './drugitemdetails/drugitemdetails.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    DrugitemsModule,
    DashboardModule,
    ImportItemsModule,
    ScheduleModule.forRoot(),
    BackofficeScheduleModule,
    StocksModule,
    DrugitemdetailsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
