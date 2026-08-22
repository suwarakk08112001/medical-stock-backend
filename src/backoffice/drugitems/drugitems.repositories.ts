import { Injectable } from '@nestjs/common';
import { CreateDrugitemDto } from './dto/create-drugitem.dto';
import { UpdateDrugitemDto } from './dto/update-drugitem.dto';
import { ResponseDrugitemdto } from './dto/response-drugitem.dto';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { PaginatedResult } from 'src/common/pagination/paginate.interface';
import { Prisma } from 'generated/db1/client';
import { paginate } from 'src/common/pagination/paginate.util';
import { PaginationDrugitemDto } from './dto/paginate-drugitem.dto';

@Injectable()
export class DrugitemsRepositories {
    constructor(private db1prisma: DB1PrismaService) {}
  create(createDrugitemDto: CreateDrugitemDto) {
    return 'This action adds a new drugitem';
  }
  async findAll(): Promise<ResponseDrugitemdto[]> {
   
    return this.db1prisma.drugitemcode.findMany({
      select: {
        id: true,
        mpack: true,
        icode: true,
        invcode: true,
        unit: true,
        drugitem: {
          select: {
            icode: true,
            name: true,
            strength: true,
            invcode: true,
          }
        }
      }
    })
  }

  async findManyPaginated(options: PaginationDrugitemDto): Promise<PaginatedResult<ResponseDrugitemdto>> {
    const orConditions: Prisma.drugitemcodeWhereInput[] = [];
  
    if (options.search) {
      orConditions.push(
        { icode: { contains: options.search } },
        { invcode: { contains: options.search } },
        { unit: { contains: options.search } },
        { drugitem: { is: { name: { contains: options.search } } } },
      );
  
      const numericSearch = Number(options.search);
      if (!Number.isNaN(numericSearch)) {
        orConditions.push({ mpack: { equals: numericSearch } });
      }
    }
  
    const whereCondition: Prisma.drugitemcodeWhereInput = options.search
      ? { OR: orConditions }
      : {};
  
    const queryFn = (skip: number, take: number) => {
      return this.db1prisma.drugitemcode.findMany({
        where: whereCondition,
        skip,
        take,
      
        select: {
          id: true,
          mpack: true,
          icode: true,
          invcode: true,
          unit: true,
          drugitem: {
            select: {
              icode: true,
              name: true,
              strength: true,
              invcode: true,
            },
          },
        },
      });
    };
  
    const countFn = () => {
      return this.db1prisma.drugitemcode.count({ where: whereCondition });
    };
  
    return paginate(queryFn, countFn, options);
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
