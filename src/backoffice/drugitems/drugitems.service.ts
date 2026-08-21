import { Injectable } from '@nestjs/common';
import { CreateDrugitemDto } from './dto/create-drugitem.dto';
import { UpdateDrugitemDto } from './dto/update-drugitem.dto';
import { PaginationDrugitemDto } from './dto/paginate-drugitem.dto';
import { DrugitemsRepositories } from './drugitems.repositories';
import { ExceptionService } from 'src/common/exception/exception.service';
import { MESSAGE } from 'src/common/message';


@Injectable()
export class DrugitemsService {
  constructor(private drugitemRepositories: DrugitemsRepositories,
      private exceptionService: ExceptionService) {}
  create(createDrugitemDto: CreateDrugitemDto) {
    return 'This action adds a new drugitem';
  }

  async findAll() {
    const data = await this.drugitemRepositories.findAll();
    return {
      drugitem:data,
      message:MESSAGE.DRUGITEM.GET_SUCCESS
    };
  }

  async findMany(dto:PaginationDrugitemDto){
    const data = await this.drugitemRepositories.findManyPaginated(dto);
    return {
      drugitem:data,
      message:MESSAGE.DRUGITEM.GET_PAGINATED_SUCCESS
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} drugitem`;
  }

  update(id: number, updateDrugitemDto: UpdateDrugitemDto) {
    return `This action updates a #${id} drugitem`;
  }

  remove(id: number) {
    return `This action removes a #${id} drugitem`;
  }
}
