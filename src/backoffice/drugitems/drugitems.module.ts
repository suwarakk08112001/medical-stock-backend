import { Module } from '@nestjs/common';
import { DrugitemsService } from './drugitems.service';
import { DrugitemsController } from './drugitems.controller';
import { DrugitemsRepositories } from './drugitems.repositories';
import { PrismaService } from 'src/prisma/prisma.service';
@Module({
  controllers: [DrugitemsController],
  providers: [DrugitemsService, PrismaService, DrugitemsRepositories],
})
export class DrugitemsModule {}
