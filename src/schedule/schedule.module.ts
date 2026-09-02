import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScheduleService],
})
export class BackofficeScheduleModule {}
