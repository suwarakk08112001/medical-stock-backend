import { Test, TestingModule } from '@nestjs/testing';
import { DrugitemdetailsController } from './drugitemdetails.controller';
import { DrugitemdetailsService } from './drugitemdetails.service';

describe('DrugitemdetailsController', () => {
  let controller: DrugitemdetailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DrugitemdetailsController],
      providers: [DrugitemdetailsService],
    }).compile();

    controller = module.get<DrugitemdetailsController>(DrugitemdetailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
