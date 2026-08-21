import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './backoffice/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DrugitemsModule } from './backoffice/drugitems/drugitems.module';
import { ImportItemsModule } from './import-items/import-items.module';
import { BackofficeDashboardModule } from './backoffice/dashboard/dashboard.module';
@Module({
  imports: [PrismaModule, AuthModule,DrugitemsModule, DashboardModule, ImportItemsModule, BackofficeDashboardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
