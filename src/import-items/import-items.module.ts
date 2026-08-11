import { Module } from '@nestjs/common';
import { ImportItemsService } from './import-items.service';
import { ImportItemsController } from './import-items.controller';

@Module({
  controllers: [ImportItemsController],
  providers: [ImportItemsService],
})
export class ImportItemsModule {}
