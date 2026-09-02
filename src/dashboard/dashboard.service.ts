import { Injectable } from '@nestjs/common';

import { SearchDashboardDto } from './dto/search-dashboard.dto';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { DB2PrismaService } from 'src/prisma/db2-prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private db1prisma: DB1PrismaService,
    private db2prisma: DB2PrismaService,
  ) {}

  async findTotalDrugHOSxP() {
    const total_drug_items_HOSxP = await this.db1prisma.drugItemCodes.count();
    return { total_drug_items_HOSxP };
  }

  async findTotalDrugHOSxP_PCU() {
    const total_drug_items_HOSxP_PCU =
      await this.db2prisma.drugitemcode.count();
    return { total_drug_items_HOSxP_PCU };
  }
  async findTotalStockOutTodayHOSxP() {
    const result = await this.db1prisma.$queryRaw<{ total_icode: bigint }[]>`
    SELECT COUNT(DISTINCT op.icode) AS total_icode
    FROM opitemrece op
    INNER JOIN drugItemCodes d
      ON op.icode = d.icode
    WHERE op.vstdate = CURRENT_DATE
  `;

    const total_stock_out_today_HOSxP = Number(result[0].total_icode);
    console.log(total_stock_out_today_HOSxP);
    return { total_stock_out_today_HOSxP };
  }

  async findTotalStockOutTodayHOSxP_PCU() {
    const result = await this.db2prisma.$queryRaw<{ total_icode: bigint }[]>`
    SELECT COUNT(DISTINCT op.icode) AS total_icode
    FROM opitemrece op
    INNER JOIN drugitemcode d
      ON op.icode = d.icode
    WHERE op.vstdate = CURRENT_DATE
  `;

    const total_stock_out_today_HOSxP_PCU = Number(result[0].total_icode);
    console.log(total_stock_out_today_HOSxP_PCU);
    return { total_stock_out_today_HOSxP_PCU };
  }

  async findTotalBvalue() {
    const result = await this.db1prisma.drugItemStocks.aggregate({
      _sum: {
        bal_value: true,
      },
    });

    const total_balance_value = (result._sum.bal_value ?? 0).toFixed(2);
    return { total_balance_value };
  }

  // async findTopTenTTR(dto: SearchDashboardDto) {
  //   const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();

  //   const where = dto.month
  //     ? { yearmonth: this.getYearMonth(financialYear, dto.month) }
  //     : {
  //         yearmonth: {
  //           gte: this.getFiscalYearRange(financialYear).start,
  //           lte: this.getFiscalYearRange(financialYear).end,
  //         },
  //       };

  //   console.log('financialYear received:', dto.financialYear);
  //   console.log('financialYear used:', financialYear);
  //   console.log('computed where:', JSON.stringify(where));

  //   return this.db1prisma.drugItemStocks.findMany({
  //     where,
  //     orderBy: {
  //       ttr: 'desc',
  //     },
  //     take: 10,
  //     include: {
  //       drugItemCodes: {
  //         select:{
  //           icode:true,
  //           invcode:true,
  //           mpack:true,
  //           unit:true,
  //           drugitem:{
  //             select:{
  //               name:true
  //             }
  //           }
  //         }
  //     },
  //     },
  //   });
  // }
  async findTopTenTTR(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
  
    const yearmonthFilter = dto.month
      ? { start: this.getYearMonth(financialYear, dto.month), end: this.getYearMonth(financialYear, dto.month) }
      : this.getFiscalYearRange(financialYear);
  
    console.log('financialYear received:', dto.financialYear);
    console.log('financialYear used:', financialYear);
    console.log('computed range:', JSON.stringify(yearmonthFilter));
  
    const rows = await this.db1prisma.$queryRaw
      <{
        id: number;
        ttr: number;
        bal_value: number;
        icode: string;
        invcode: string;
        mpack: number | null;
        unit: string | null;
        name: string | null;
      }[]
    >`
      WITH ranked AS (
          SELECT
              dis.drugItemCodeId,
              dis.ttr,
              dis.bal_value,
              dis.closingdate,
              ROW_NUMBER() OVER (
                  PARTITION BY dis.drugItemCodeId
                  ORDER BY dis.closingdate DESC, dis.id DESC
              ) AS rn
          FROM drugItemStocks dis
          WHERE dis.drugItemCodeId IS NOT NULL
            AND dis.yearmonth BETWEEN ${yearmonthFilter.start} AND ${yearmonthFilter.end}
      )
      SELECT
          ranked.drugItemCodeId AS id,
          ranked.ttr,
          ranked.bal_value,
          dic.icode,
          dic.invcode,
          dic.mpack,
          dic.unit,
          di.name
      FROM ranked
      INNER JOIN drugItemCodes dic ON dic.id = ranked.drugItemCodeId
      LEFT JOIN drugitems di ON di.icode = dic.icode
      WHERE ranked.rn = 1
      ORDER BY ranked.ttr DESC
      LIMIT 10
    `;
  
    return rows.map((r) => ({
      id: r.id,
      ttr: Number(r.ttr ?? 0),
      bal_value: Number(r.bal_value ?? 0),
      drugItemCodes: {
        icode: r.icode,
        invcode: r.invcode,
        mpack: r.mpack,
        unit: r.unit,
        drugitem: { name: r.name },
      },
    }));
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
  
    const grouped = await this.db1prisma.drugItemStocks.groupBy({
      by: ['drugItemCodeId'],
      where,
      _sum: {
        tr: true,
        rvalue: true,
      },
      orderBy: {
        _sum: {
          tr: 'desc',
        },
      },
      take: 10,
    });
  
    if (!grouped.length) return [];
  
    // กรอง null ออกก่อน เพราะ drugItemCodeId เป็น nullable field
    const ids = grouped
      .map((g) => g.drugItemCodeId)
      .filter((id): id is number => id !== null);
  
    const drugItemCodes = await this.db1prisma.drugItemCodes.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        icode: true,
        invcode: true,
        mpack: true,
        unit: true,
        drugitem: {
          select: { name: true },
        },
      },
    });
  
    const codeMap = new Map(drugItemCodes.map((d) => [d.id, d]));
  
    return grouped.map((g) => ({
      id: g.drugItemCodeId,
      tr: g._sum.tr ?? 0,
      rvalue: g._sum.rvalue ?? 0,
      drugItemCodes: g.drugItemCodeId != null ? codeMap.get(g.drugItemCodeId) ?? null : null,
    }));
  }

  async findDvaluemonthly(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
    const grouped = await this.db1prisma.drugItemStocks.groupBy({
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

    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน (format YYYYMM)
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}${String(
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
    const grouped = await this.db1prisma.drugItemStocks.groupBy({
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

    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน (format YYYYMM)
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}${String(
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

  async findRvalueMonthly(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    // 1) ดึงข้อมูลจริงที่มีอยู่ในตาราง แล้ว group ตาม yearmonth
    const grouped = await this.db1prisma.drugItemStocks.groupBy({
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

    // 3.1) คำนวณ "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน (format YYYYMM)
    //      เช่น วันนี้อยู่เดือน ส.ค. -> เดือนตัดรอบคือ ก.ค. (yearmonth ล่าสุดที่จะแสดง)
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}${String(
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

  async findMonthlyMedicineStock(dto: SearchDashboardDto) {
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
  
    const grouped = await this.db1prisma.$queryRaw
     < {
        yearmonth: string;
        total_remainvalue: number | null;
        total_dvalue: number | null;
        item_count: bigint;
      }[]
    >`
      WITH ranked_remain AS (
          SELECT
              drugItemCodeId,
              remainvalue,
              yearmonth,
              ROW_NUMBER() OVER (
                  PARTITION BY drugItemCodeId, yearmonth
                  ORDER BY closingdate ASC, id ASC
              ) AS rn
          FROM drugItemStocks
          WHERE yearmonth BETWEEN ${start} AND ${end}
      ),
      remain_totals AS (
          SELECT
              yearmonth,
              SUM(remainvalue) AS total_remainvalue
          FROM ranked_remain
          WHERE rn = 1
          GROUP BY yearmonth
      ),
      dvalue_totals AS (
          SELECT
              yearmonth,
              SUM(dvalue) AS total_dvalue,
              COUNT(*) AS item_count
          FROM drugItemStocks
          WHERE yearmonth BETWEEN ${start} AND ${end}
          GROUP BY yearmonth
      )
      SELECT
          r.yearmonth,
          r.total_remainvalue,
          d.total_dvalue,
          d.item_count
      FROM remain_totals r
      LEFT JOIN dvalue_totals d ON d.yearmonth = r.yearmonth
    `;
  
    const groupedMap = new Map(
      grouped
        .filter((g) => g.yearmonth !== null)
        .map((g) => [this.normalizeYearMonth(g.yearmonth), g]),
    );
  
    const months = this.getFiscalYearMonths(financialYear);
  
    const filteredMonths = dto.month
      ? months.filter(
          (yearmonth) =>
            yearmonth === this.getYearMonth(financialYear, dto.month as number),
        )
      : months;
  
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffYearMonth = `${cutoffDate.getFullYear()}${String(
      cutoffDate.getMonth() + 1,
    ).padStart(2, '0')}`;
  
    const visibleMonths = filteredMonths.filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
  
    return visibleMonths.map((yearmonth) => {
      const g = groupedMap.get(this.normalizeYearMonth(yearmonth));
  
      const rawRemainvalue = g?.total_remainvalue ? Number(g.total_remainvalue) : 0;
      const rawDvalue = g?.total_dvalue ? Number(g.total_dvalue) : 0;
  
      const roundedRemainvalue = Math.round(rawRemainvalue * 100) / 100;
      const roundedDvalue = Math.round(rawDvalue * 100) / 100;
  
      // อัตราสำรองยา (วัน) = (remainvalue / dvalue) * 30 -> ปัดเป็นจำนวนเต็ม ไม่มีทศนิยม
      const stockReserveDays =
        roundedDvalue === 0
          ? 0
          : Math.round((roundedRemainvalue / roundedDvalue) * 30);
  
      return {
        yearmonth,
        ปีงบประมาณ: financialYear,
        เดือน: this.formatThaiMonthLabel(yearmonth),
        จำนวนรายการ: g ? Number(g.item_count) : 0,
        remainvalue: roundedRemainvalue,
        dvalue: roundedDvalue,
        อัตราสำรองยา_วัน: stockReserveDays,
      };
    });
  }
  // ---------- Helpers: ปีงบประมาณ (ต.ค. -> ก.ย.) ----------
  // หมายเหตุ: yearmonth ในฐานข้อมูลใช้ format "YYYYMM" (6 หลัก ไม่มีขีด เช่น "202607")
  // helper ทุกตัวด้านล่างถูกปรับให้สร้าง/เทียบค่าใน format นี้ให้ตรงกับข้อมูลจริง

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

  // ช่วง yearmonth (string, "YYYYMM") ของทั้งปีงบ ต.ค. -> ก.ย.
  private getFiscalYearRange(financialYear: number): {
    start: string;
    end: string;
  } {
    const endGYear = this.toGregorianYear(financialYear);
    const startGYear = endGYear - 1;
    return {
      start: `${startGYear}10`, // เช่น "202510"
      end: `${endGYear}09`, // เช่น "202609"
    };
  }

  // yearmonth (string, "YYYYMM") ของเดือนที่ระบุ ภายใต้ปีงบที่กำหนด
  private getYearMonth(financialYear: number, month: number): string {
    const endGYear = this.toGregorianYear(financialYear);
    const startGYear = endGYear - 1;
    const gYear = month >= 10 ? startGYear : endGYear;
    return `${gYear}${String(month).padStart(2, '0')}`; // เช่น "202607"
  }

  // normalize yearmonth ให้เป็น "YYYYMM" (6 หลัก, ไม่มีขีด) เสมอ
  // รองรับทั้งของเดิมที่อาจมีขีด ("2026-7", "2026-07") และแบบไม่มีขีดที่ขาด leading zero ("20267")
  private normalizeYearMonth(ym: string): string {
    const trimmed = ym.trim();

    if (trimmed.includes('-')) {
      const [y, m] = trimmed.split('-');
      return `${y}${String(Number(m)).padStart(2, '0')}`;
    }

    if (trimmed.length === 5) {
      // เช่น "20267" -> ปี 4 หลัก + เดือน 1 หลัก ที่ขาด leading zero
      const y = trimmed.slice(0, 4);
      const m = trimmed.slice(4);
      return `${y}${m.padStart(2, '0')}`;
    }

    return trimmed; // ถือว่าเป็น "YYYYMM" ที่ถูกต้องอยู่แล้ว
  }

  // สร้างรายการ yearmonth ("YYYYMM") ครบ 12 เดือน เรียงจาก ต.ค. -> ก.ย. ของปีงบที่ระบุ (พ.ศ.)
  private getFiscalYearMonths(financialYear: number): string[] {
    const { start } = this.getFiscalYearRange(financialYear);
    const startYear = Number(start.slice(0, 4));
    const startMonth = Number(start.slice(4, 6));

    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const totalMonth = startMonth - 1 + i; // 0-based
      const y = startYear + Math.floor(totalMonth / 12);
      const m = (totalMonth % 12) + 1;
      months.push(`${y}${String(m).padStart(2, '0')}`);
    }
    return months;
  }

  // แปลง yearmonth ("YYYYMM", ค.ศ.) -> ป้ายกำกับเดือนภาษาไทย เช่น "ต.ค.68"
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

    const normalized = this.normalizeYearMonth(yearmonth);
    const gYear = normalized.slice(0, 4);
    const month = normalized.slice(4, 6);
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
