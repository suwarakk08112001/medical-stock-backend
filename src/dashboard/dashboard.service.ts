import { Injectable } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { SearchDashboardDto } from './dto/search-dashboard.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  create(createDashboardDto: CreateDashboardDto) {
    return 'This action adds a new dashboard';
  }

  async findTotalDrug() {
    const total_drug_items = await this.prisma.drugitemcode.count();
    return { total_drug_items };
  }

  async findTotalBvalue() {
    const result = await this.prisma.balance.aggregate({
      _sum: {
        bal_value: true,
      },
    });

    const total_balance_value = (result._sum.bal_value ?? 0).toFixed(2);
    return { total_balance_value };
  }

  async findTopTenTTR(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();

    const where = dto.month
      ? { yearmonth: this.getYearMonth(financialYear, dto.month) }
      : {
          yearmonth: {
            gte: this.getFiscalYearRange(financialYear).start,
            lte: this.getFiscalYearRange(financialYear).end,
          },
        };

    console.log('financialYear received:', dto.financialYear);
    console.log('financialYear used:', financialYear);
    console.log('computed where:', JSON.stringify(where));

    return this.prisma.balance.findMany({
      where,
      orderBy: {
        ttr: 'desc',
      },
      take: 10,
      include: {
        drugitem: {
          select: { name: true, strength:true },
        },
      },
    });
  }

  async findTopTenTR(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();

    const where = dto.month
      ? { yearmonth: this.getYearMonth(financialYear, dto.month) }
      : {
          yearmonth: {
            gte: this.getFiscalYearRange(financialYear).start,
            lte: this.getFiscalYearRange(financialYear).end,
          },
        };

    console.log('financialYear received:', dto.financialYear);
    console.log('financialYear used:', financialYear);
    console.log('computed where:', JSON.stringify(where));

    return this.prisma.importdrugitem.findMany({
      where,
      orderBy: {
        tr: 'desc',
      },
      take: 10,
      include: {
        drugitem: {
          select: { name: true, strength:true },
        },
      },
    });
  }
  // ---------- Helpers: ปีงบประมาณ (ต.ค. -> ก.ย.) ----------

  private getCurrentFiscalYear(): number {
    const now = new Date();
    const gYear = now.getFullYear();
    const gMonth = now.getMonth() + 1;
    const endGYear = gMonth >= 10 ? gYear + 1 : gYear;
    return endGYear + 543; // คืนเป็น พ.ศ. เสมอ (ค่า default)
  }

  // แปลงปีที่รับมาให้เป็น ค.ศ. เสมอ
  // ถ้า year > 2500 ถือว่าเป็น พ.ศ. -> ลบ 543
  // ถ้า year <= 2500 ถือว่าเป็น ค.ศ. อยู่แล้ว -> ใช้ตรงๆ
  private toGregorianYear(year: number): number {
    return year > 2500 ? year - 543 : year;
  }

  // ช่วง yearmonth (string, "YYYY-MM") ของทั้งปีงบ ต.ค. -> ก.ย.
  private getFiscalYearRange(financialYear: number): {
    start: string;
    end: string;
  } {
    const endGYear = this.toGregorianYear(financialYear);
    const startGYear = endGYear - 1;
    return {
      start: `${startGYear}-10`, // เช่น "2025-10"
      end: `${endGYear}-09`, // เช่น "2026-09"
    };
  }

  // yearmonth (string, "YYYY-MM") ของเดือนที่ระบุ ภายใต้ปีงบที่กำหนด
  private getYearMonth(financialYear: number, month: number): string {
    const endGYear = this.toGregorianYear(financialYear);
    const startGYear = endGYear - 1;
    const gYear = month >= 10 ? startGYear : endGYear;
    return `${gYear}-${String(month).padStart(2, '0')}`; // เช่น "2026-07"
  }

  findAll() {
    return `This action returns all dashboard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  update(id: number, updateDashboardDto: UpdateDashboardDto) {
    return `This action updates a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
