import { Module } from '@nestjs/common';
import { DrugitemsService } from './drugitems.service';
import { DrugitemsController } from './drugitems.controller';
import { DrugitemsRepositories } from './drugitems.repositories';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
@Module({
  controllers: [DrugitemsController],
  providers: [DrugitemsService, DB1PrismaService, DrugitemsRepositories],
})
export class DrugitemsModule {}
