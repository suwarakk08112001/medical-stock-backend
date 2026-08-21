import { Test, TestingModule } from '@nestjs/testing';
import { DrugitemsController } from './drugitems.controller';
import { DrugitemsService } from './drugitems.service';

describe('DrugitemsController', () => {
  let controller: DrugitemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrugitemsController],
      providers: [DrugitemsService],
    }).compile();

    controller = module.get<DrugitemsController>(DrugitemsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
