import { Module } from '@nestjs/common';
import { DrugitemdetailsService } from './drugitemdetails.service';
import { DrugitemdetailsController } from './drugitemdetails.controller';

@Module({
  controllers: [DrugitemdetailsController],
  providers: [DrugitemdetailsService],
})
export class DrugitemdetailsModule {}
