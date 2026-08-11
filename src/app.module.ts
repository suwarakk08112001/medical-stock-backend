import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './backoffice/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { ImportItemsModule } from './import-items/import-items.module';

@Module({
  imports: [PrismaModule, AuthModule, DashboardModule, ImportItemsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
