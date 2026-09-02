import { Test, TestingModule } from '@nestjs/testing';
import { DrugitemsService } from './drugitems.service';

describe('DrugitemsService', () => {
  let service: DrugitemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrugitemsService],
    }).compile();

    service = module.get<DrugitemsService>(DrugitemsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
