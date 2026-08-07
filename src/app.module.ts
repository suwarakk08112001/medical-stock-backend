import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './backoffice/auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ImportModule } from './import/import.module';

@Module({
  imports: [PrismaModule, AuthModule, DashboardModule, ImportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
