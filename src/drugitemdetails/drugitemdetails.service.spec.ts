import { Test, TestingModule } from '@nestjs/testing';
import { DrugitemdetailsService } from './drugitemdetails.service';

describe('DrugitemdetailsService', () => {
  let service: DrugitemdetailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DrugitemdetailsService],
    }).compile();

    service = module.get<DrugitemdetailsService>(DrugitemdetailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
