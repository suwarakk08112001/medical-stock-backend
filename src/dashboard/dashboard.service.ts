import { Injectable } from '@nestjs/common';

import { SearchDashboardDto } from './dto/search-dashboard.dto';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';

@Injectable()
export class DashboardService {
  constructor(private db1prisma: DB1PrismaService) {}

  async findTotalDrug() {
    const total_drug_items = await this.db1prisma.drugitemcode.count();
    return { total_drug_items };
  }

  async findTotalBvalue() {
    const result = await this.db1prisma.balance.aggregate({
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

    return this.db1prisma.balance.findMany({
      where,
      orderBy: {
        ttr: 'desc',
      },
      take: 10,
      include: {
        drugitem: {
          select: { name: true, strength: true },
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

    return this.db1prisma.importdrugitem.findMany({
      where,
      orderBy: {
        tr: 'desc',
      },
      take: 10,
      include: {
        drugitem: {
          select: { name: true, strength: true },
        },
      },
    });
  }

  // async findTdMonthly(dto: SearchDashboardDto) {
  //   const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
  //   const { start, end } = this.getFiscalYearRange(financialYear);

  //   // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
  //   const grouped = await this.prisma.exportdrugitem.groupBy({
  //     by: ['yearmonth'],
  //     where: {
  //       yearmonth: {
  //         gte: start,
  //         lte: end,
  //       },
  //     },
  //     _count: { _all: true },
  //     _sum: {
  //       td: true,
  //       dvalue: true,
  //     },
  //   });

  //   // 2) ทำ map ไว้ค้นหาเร็วๆ ด้วย yearmonth (normalize แล้ว) เป็น key
  //   //    normalize กันกรณี DB เก็บ format ไม่ตรงกับที่เรา generate (เช่น "2024-9" vs "2024-09")
  //   // const groupedMap = new Map(
  //   //   grouped.map((g) => [this.normalizeYearMonth(g.yearmonth), g]),
  //   // );
  //   const groupedMap = new Map(
  //     grouped
  //       .filter((g) => g.yearmonth !== null)
  //       .map((g) => [this.normalizeYearMonth(g.yearmonth as string), g]),
  //   );

  //   // 3) สร้างรายการ 12 เดือนของปีงบประมาณ (ต.ค. -> ก.ย.) ให้ครบเสมอ
  //   const months = this.getFiscalYearMonths(financialYear);

  //   // 4) เติมข้อมูลจริงลงไป เดือนไหนไม่มีให้เป็น 0
  //   return months.map((yearmonth) => {
  //     const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  //     return {
  //       yearmonth,
  //       ปีงบประมาณ: financialYear,
  //       เดือน: this.formatThaiMonthLabel(yearmonth),
  //       จำนวนรายการ: g?._count._all ?? 0,
  //       ผลรวม_td: g?._sum.td ?? 0,
  //       ผลรวม_dvalue: g?._sum.dvalue ?? 0,
  //     };
  //   });
  // }
  async findDvaluemonthly(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
  
    // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
    const grouped = await this.db1prisma.exportdrugitem.groupBy({
      by: ['yearmonth'],
      where: {
        yearmonth: {
          gte: start,
          lte: end,
        },
      },
      _count: { _all: true },
      _sum: {
        td: true,
        dvalue: true,
      },
    });
  
    // 2) ทำ map ไว้ค้นหาเร็วๆ ด้วย yearmonth (normalize แล้ว) เป็น key
    const groupedMap = new Map(
      grouped
        .filter((g) => g.yearmonth !== null)
        .map((g) => [this.normalizeYearMonth(g.yearmonth as string), g]),
    );
  
    // 3) สร้างรายการ 12 เดือนของปีงบประมาณ (ต.ค. -> ก.ย.) ให้ครบเสมอ
    const months = this.getFiscalYearMonths(financialYear);
  
    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}-${String(
      cutoffDate.getMonth() + 1,
    ).padStart(2, '0')}`;
  
    // 3.2) ตัดเดือนที่ยังไม่ถึง (มากกว่าเดือนตัดรอบ) ออก
    const visibleMonths = months.filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
  
    // 4) เติมข้อมูลจริงลงไป เดือนไหนไม่มีให้เป็น 0
    return visibleMonths.map((yearmonth) => {
      const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  
      // แปลง dvalue ให้เป็น number ก่อน (เผื่อเป็น Prisma.Decimal) แล้วปัด 2 ตำแหน่ง
      const rawDvalue = g?._sum.dvalue ? Number(g._sum.dvalue) : 0;
      const roundedDvalue = Math.round(rawDvalue * 100) / 100;
  
      return {
        yearmonth,
        ปีงบประมาณ: financialYear,
        เดือน: this.formatThaiMonthLabel(yearmonth),
        จำนวนรายการ: g?._count._all ?? 0,
        td: g?._sum.td ?? 0,
        dvalue: roundedDvalue,
      };
    });
  }
  
  async findRemainvalueMonthly(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
  
    // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
    const grouped = await this.db1prisma.carrydrugitem.groupBy({
      by: ['yearmonth'],
      where: {
        yearmonth: {
          gte: start,
          lte: end,
        },
      },
      _count: { _all: true },
      _sum: {
        tremain: true,
        remainvalue: true,
      },
    });
  
    // 2) ทำ map ไว้ค้นหาเร็วๆ ด้วย yearmonth (normalize แล้ว) เป็น key
    const groupedMap = new Map(
      grouped
        .filter((g) => g.yearmonth !== null)
        .map((g) => [this.normalizeYearMonth(g.yearmonth as string), g]),
    );
  
    // 3) สร้างรายการ 12 เดือนของปีงบประมาณ (ต.ค. -> ก.ย.) ให้ครบเสมอ
    const months = this.getFiscalYearMonths(financialYear);
  
    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}-${String(
      cutoffDate.getMonth() + 1,
    ).padStart(2, '0')}`;
  
    // 3.2) ตัดเดือนที่ยังไม่ถึง (มากกว่าเดือนตัดรอบ) ออก
    const visibleMonths = months.filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
  
    // 4) เติมข้อมูลจริงลงไป เดือนไหนไม่มีให้เป็น 0
    return visibleMonths.map((yearmonth) => {
      const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  
      // แปลง remainvalue ให้เป็น number ก่อน (เผื่อเป็น Prisma.Decimal) แล้วปัด 2 ตำแหน่ง
      const rawRemainvalue = g?._sum.remainvalue
        ? Number(g._sum.remainvalue)
        : 0;
      const roundedRemainvalue = Math.round(rawRemainvalue * 100) / 100;
  
      return {
        yearmonth,
        ปีงบประมาณ: financialYear,
        เดือน: this.formatThaiMonthLabel(yearmonth),
        จำนวนรายการ: g?._count._all ?? 0,
        tremain: g?._sum.tremain ?? 0,
        remainvalue: roundedRemainvalue,
      };
    });
  }
  // async findRvalueMonthly(dto: SearchDashboardDto) {
  //   const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
  //   const { start, end } = this.getFiscalYearRange(financialYear);

  //   // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
  //   const grouped = await this.prisma.importdrugitem.groupBy({
  //     by: ['yearmonth'],
  //     where: {
  //       yearmonth: {
  //         gte: start,
  //         lte: end,
  //       },
  //     },
  //     _count: { _all: true },
  //     _sum: {
  //       tr: true,
  //       rvalue: true,
  //     },
  //   });

  //   // 2) ทำ map ไว้ค้นหาเร็วๆ ด้วย yearmonth (normalize แล้ว) เป็น key
  //   const groupedMap = new Map(
  //     grouped
  //       .filter((g) => g.yearmonth !== null)
  //       .map((g) => [this.normalizeYearMonth(g.yearmonth as string), g]),
  //   );

  //   // 3) สร้างรายการ 12 เดือนของปีงบประมาณ (ต.ค. -> ก.ย.) ให้ครบเสมอ
  //   const months = this.getFiscalYearMonths(financialYear);

  //   // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน
  //   //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
  //   const now = new Date();
  //   const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  //   const cutoffYearMonth = `${cutoffDate.getFullYear()}-${String(
  //     cutoffDate.getMonth() + 1,
  //   ).padStart(2, '0')}`;

  //   // 3.2) ตัดเดือนที่ยังไม่ถึง (มากกว่าเดือนตัดรอบ) ออก
  //   const visibleMonths = months.filter(
  //     (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
  //   );

  //   // 4) เติมข้อมูลจริงลงไป เดือนไหนไม่มีให้เป็น 0
  //   return visibleMonths.map((yearmonth) => {
  //     const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  //     return {
  //       yearmonth,
  //       ปีงบประมาณ: financialYear,
  //       เดือน: this.formatThaiMonthLabel(yearmonth),
  //       จำนวนรายการ: g?._count._all ?? 0,
  //       tr: g?._sum.tr ?? 0,
  //       rvalue: g?._sum.rvalue ?? 0,
  //     };
  //   });
  // }
  async findRvalueMonthly(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
  
    // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
    const grouped = await this.db1prisma.importdrugitem.groupBy({
      by: ['yearmonth'],
      where: {
        yearmonth: {
          gte: start,
          lte: end,
        },
      },
      _count: { _all: true },
      _sum: {
        tr: true,
        rvalue: true,
      },
    });
  
    // 2) ทำ map ไว้ค้นหาเร็วๆ ด้วย yearmonth (normalize แล้ว) เป็น key
    const groupedMap = new Map(
      grouped
        .filter((g) => g.yearmonth !== null)
        .map((g) => [this.normalizeYearMonth(g.yearmonth as string), g]),
    );
  
    // 3) สร้างรายการ 12 เดือนของปีงบประมาณ (ต.ค. -> ก.ย.) ให้ครบเสมอ
    const months = this.getFiscalYearMonths(financialYear);
  
    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}-${String(
      cutoffDate.getMonth() + 1,
    ).padStart(2, '0')}`;
  
    // 3.2) ตัดเดือนที่ยังไม่ถึง (มากกว่าเดือนตัดรอบ) ออก
    const visibleMonths = months.filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
  
    // 4) เติมข้อมูลจริงลงไป เดือนไหนไม่มีให้เป็น 0
    return visibleMonths.map((yearmonth) => {
      const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  
      // แปลง rvalue ให้เป็น number ก่อน (เผื่อเป็น Prisma.Decimal) แล้วปัด 2 ตำแหน่ง
      const rawRvalue = g?._sum.rvalue ? Number(g._sum.rvalue) : 0;
      const roundedRvalue = Math.round(rawRvalue * 100) / 100;
  
      return {
        yearmonth,
        ปีงบประมาณ: financialYear,
        เดือน: this.formatThaiMonthLabel(yearmonth),
        จำนวนรายการ: g?._count._all ?? 0,
        tr: g?._sum.tr ?? 0,
        rvalue: roundedRvalue,
      };
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

  // normalize "YYYY-M" / " YYYY-MM " ให้เป็น "YYYY-MM" เสมอ กันปัญหา padding ไม่ตรง
  private normalizeYearMonth(ym: string): string {
    const [y, m] = ym.trim().split('-');
    return `${y}-${String(Number(m)).padStart(2, '0')}`;
  }

  // สร้างรายการ yearmonth ("YYYY-MM") ครบ 12 เดือน เรียงจาก ต.ค. -> ก.ย. ของปีงบที่ระบุ (พ.ศ.)
  private getFiscalYearMonths(financialYear: number): string[] {
    const { start } = this.getFiscalYearRange(financialYear);
    const [startYear, startMonth] = start.split('-').map(Number);

    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const totalMonth = startMonth - 1 + i; // 0-based
      const y = startYear + Math.floor(totalMonth / 12);
      const m = (totalMonth % 12) + 1;
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
    return months;
  }

  // แปลง yearmonth ("YYYY-MM", ค.ศ.) -> ป้ายกำกับเดือนภาษาไทย เช่น "ต.ค.68"
  private formatThaiMonthLabel(yearmonth: string): string {
    const thaiMonths: Record<string, string> = {
      '10': 'ต.ค.',
      '11': 'พ.ย.',
      '12': 'ธ.ค.',
      '01': 'ม.ค.',
      '02': 'ก.พ.',
      '03': 'มี.ค.',
      '04': 'เม.ย.',
      '05': 'พ.ค.',
      '06': 'มิ.ย.',
      '07': 'ก.ค.',
      '08': 'ส.ค.',
      '09': 'ก.ย.',
    };

    const [gYear, month] = this.normalizeYearMonth(yearmonth).split('-');
    const beYearShort = String(Number(gYear) + 543).slice(-2);
    return `${thaiMonths[month]}${beYearShort}`;
  }

  findAll() {
    return `This action returns all dashboard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} dashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} dashboard`;
  }
}
