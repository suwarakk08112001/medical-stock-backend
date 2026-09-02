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
    return this.db1prisma.drugItemCodes.findMany({
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
  }

  async findManyPaginated(
    options: PaginationDrugitemDto,
  ): Promise<PaginatedResult<ResponseDrugitemdto>> {
    const search = options.search?.trim();
    const orConditions: Prisma.drugItemCodesWhereInput[] = [];
  
    if (search) {
      orConditions.push(
        { icode: { contains: search } },
        { invcode: { contains: search } },
        { unit: { contains: search } },
        { type: { contains: search } },
        { drugitem: { is: { name: { contains: search } } } },
      );
  
      const numericSearch = Number(search);
      if (!Number.isNaN(numericSearch)) {
        orConditions.push({ mpack: { equals: numericSearch } });
      }
    }
  
    const whereCondition: Prisma.drugItemCodesWhereInput = search
      ? { OR: orConditions }
      : {};
  
    const queryFn = (skip: number, take: number) => {
      return this.db1prisma.drugItemCodes.findMany({
        where: whereCondition,
        skip,
        take,
        orderBy: { id: 'desc' }, // 
        select: {
          id: true,
          mpack: true,
          icode: true,
          invcode: true,
          type: true,
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
      return this.db1prisma.drugItemCodes.count({ where: whereCondition });
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
