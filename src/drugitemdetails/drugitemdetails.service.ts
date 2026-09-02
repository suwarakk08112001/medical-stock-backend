import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDrugitemdetailDto } from './dto/create-drugitemdetail.dto';
import { UpdateDrugitemdetailDto } from './dto/update-drugitemdetail.dto';
import { SearchDrugItemDetailsDto } from './dto/seach-drugitemdetail.dto';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { DB2PrismaService } from 'src/prisma/db2-prisma.service';

/** แถวที่มี field yearmonth แบบ nullable (ใช้ constrain generic helper) */
interface YearMonthRow {
  yearmonth: string | null;
}

@Injectable()
export class DrugitemdetailsService {
  constructor(
    private db1prisma: DB1PrismaService,
    private db2prisma: DB2PrismaService,
  ) {}



  async findTotalStockHOS(drugItemCodeId: number) {
    // const data = await  this.db1prisma.totaldrugItemHos.findFirst({
    //   where:{
    //     icode:String(icode)
    //   }
    // });
    // return {data}
    const data = await this.db1prisma.totalDrugItemHOSs.findFirst({
      where: {
        drugItemCodeId:Number(drugItemCodeId)
      },
      select: {
        qty: true,
      },
    });

    const total_drug_HOS = data?.qty ?? 0; // เผื่อกรณีไม่เจอ icode นี้เลย
    return { total_drug_HOS };
  }
  async findBalanceByDrugItemCodeId(drugItemCodeId: number) {
    if (!drugItemCodeId) {
      throw new BadRequestException('drugItemCodeId is required');
    }
  
    const id = Number(drugItemCodeId);
  
    const [drugItemCode, aggregated] = await Promise.all([
      // ★ ดึง icode/invcode/mpack/unit/ชื่อยา จาก drugItemCodes (ไม่ใช่ drugItemStocks แล้ว)
      this.db1prisma.drugItemCodes.findFirst({
        where: { id:Number(drugItemCodeId) },
        select: {
          icode: true,
          invcode: true,
          mpack: true,
          unit: true,
          drugitem: {
            select: {
              name: true,
              strength: true,
              units: true,
            },
          },
        },
      }),
      // ★ แก้ชื่อ delegate เป็นพหูพจน์ (drugItemStocks) และกรองด้วย drugItemCodeId แทน icode
      this.db1prisma.drugItemStocks.aggregate({
        where: { drugItemCodeId: id },
        _sum: {
          ttr: true,
          bal_value: true,
        },
      }),
    ]);
  
    if (!drugItemCode) {
      throw new BadRequestException(
        `ไม่พบ drugItemCodeId "${drugItemCodeId}" ในระบบ`,
      );
    }
  
    return {
      icode: drugItemCode.icode,
      invcode: drugItemCode.invcode,
      mpack: drugItemCode.mpack,
      unit: drugItemCode.unit,
      name: drugItemCode.drugitem?.name ?? null,
      strength: drugItemCode.drugitem?.strength ?? null,
      units: drugItemCode.drugitem?.units ?? null,
      ttr: aggregated._sum.ttr ?? 0,
      bal_value: aggregated._sum.bal_value ?? 0,
    };
  }

  async findTotalStockOutTodayHOSxPByIcode(icode: string) {
    
    const result = await this.db1prisma.$queryRaw<{ total_icode: bigint }[]>`
      SELECT SUM(op.qty) AS total_icode
      FROM opitemrece op
      INNER JOIN drugItemCodes d
        ON op.icode = d.icode
      WHERE op.vstdate = CURRENT_DATE
        AND op.icode = ${icode}
    `;
  
    const total_stock_out_today_HOSxP = Number(result[0].total_icode);
    return { total_stock_out_today_HOSxP };
  }
  
  async findTotalStockOutTodayHOSxP_PCUByIcode(icode: string) {
    const result = await this.db2prisma.$queryRaw<{ total_icode: bigint }[]>`
      SELECT COUNT(DISTINCT op.icode) AS total_icode
      FROM opitemrece op
      INNER JOIN drugitemcode d
        ON op.icode = d.icode
      WHERE op.vstdate = CURRENT_DATE
        AND op.icode = ${icode}
    `;
  
    const total_stock_out_today_HOSxP_PCU = Number(result[0].total_icode);
    return { total_stock_out_today_HOSxP_PCU };
  }

  async findCarry(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
    console.log(dto.id);
    const grouped = await this.db1prisma.drugItemStocks.groupBy({
      by: ['yearmonth'],
      where: { drugItemCodeId: Number(dto.id), yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { tremain: true, remainvalue: true },
    });

    // const groupedMap = this.toYearMonthMap(grouped);
    const groupedMap = this.toYearMonthMap<(typeof grouped)[number]>(grouped);
    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tremain: g?._sum.tremain ?? 0,
      remainvalue: this.round2(Number(g?._sum.remainvalue ?? 0)),
    }));
  }

  async findImport(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.db1prisma.drugItemStocks.groupBy({
      by: ['yearmonth'],
      where: { drugItemCodeId: Number(dto.id), yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { tr: true, rvalue: true },
    });

    // const groupedMap = this.toYearMonthMap(grouped);
    const groupedMap = this.toYearMonthMap<(typeof grouped)[number]>(grouped);

    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tr: g?._sum.tr ?? 0,
      rvalue: this.round2(Number(g?._sum.rvalue ?? 0)),
    }));
  }

  async findExport(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.db1prisma.drugItemStocks.groupBy({
      by: ['yearmonth'],
      where: { drugItemCodeId: Number(dto.id), yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { td: true, dvalue: true },
    });

    // const groupedMap = this.toYearMonthMap(grouped);
    const groupedMap = this.toYearMonthMap<(typeof grouped)[number]>(grouped);
    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tr: g?._sum.td ?? 0,
      rvalue: this.round2(Number(g?._sum.dvalue ?? 0)),
    }));
  }

  async findExportHosxP(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);
    const geticode = await this.db1prisma.drugItemCodes.findFirst({
      where:{
        id:Number(dto.id)
      },
      select:{
        icode:true,
      }
    })
    // opitemrece.vstdate เป็น Date จริง ไม่มี yearmonth ให้ group ตรงๆ เหมือนตารางอื่น
    // เทียบด้วย DATE_FORMAT(vstdate, '%Y%m') ตรงๆ แทนการคำนวณช่วงวันที่เอง
    // (วิธีเดิมที่ต่อ "-30" ท้ายเดือนผิดสำหรับเดือน 31 วันและ ก.พ. — เทียบแบบนี้ถูกเสมอไม่ว่าจำนวนวันในเดือนจะเท่าไร)
    const rows = await this.db1prisma.$queryRaw<
      { yearmonth: string; item_count: bigint; qty: string | null }[]
    >`
      SELECT
        DATE_FORMAT(vstdate, '%Y%m') AS yearmonth,
        COUNT(*) AS item_count,
        SUM(qty) AS qty
      FROM opitemrece
      WHERE icode = ${geticode?.icode}
        AND DATE_FORMAT(vstdate, '%Y%m') >= ${start}
        AND DATE_FORMAT(vstdate, '%Y%m') <= ${end}
      GROUP BY yearmonth
      ORDER BY yearmonth
    `;

    const monthlyMap = new Map<string, { qty: number; item_count: number }>(
      rows.map((row) => [
        this.normalizeYearMonth(row.yearmonth),
        { qty: Number(row.qty ?? 0), item_count: Number(row.item_count) },
      ]),
    );

    return this.buildMonthlyReport(financialYear, monthlyMap, (m) => ({
      จำนวนรายการ: m?.item_count ?? 0,
      tr: m?.qty ?? 0,
      rvalue: 0,
    }));
  }

  async findExportHosxpPCU(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    console.log("ID :", dto.id)
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const geticode = await this.db1prisma.drugItemCodes.findFirst({
      where:{
        id:Number(dto.id)
      },
      select:{
        icode:true,
      }
    })
    console.log(geticode?.icode)
    // opitemrece.vstdate เป็น Date จริง ไม่มี yearmonth ให้ group ตรงๆ เหมือนตารางอื่น
    // เทียบด้วย DATE_FORMAT(vstdate, '%Y%m') ตรงๆ แทนการคำนวณช่วงวันที่เอง
    // (วิธีเดิมที่ต่อ "-30" ท้ายเดือนผิดสำหรับเดือน 31 วันและ ก.พ. — เทียบแบบนี้ถูกเสมอไม่ว่าจำนวนวันในเดือนจะเท่าไร)
    const rows = await this.db2prisma.$queryRaw<
      { yearmonth: string; item_count: bigint; qty: string | null }[]
    >`
      SELECT
        DATE_FORMAT(vstdate, '%Y%m') AS yearmonth,
        COUNT(*) AS item_count,
        SUM(qty) AS qty
      FROM opitemrece
      WHERE icode = ${geticode?.icode}
        AND DATE_FORMAT(vstdate, '%Y%m') >= ${start}
        AND DATE_FORMAT(vstdate, '%Y%m') <= ${end}
      GROUP BY yearmonth
      ORDER BY yearmonth
    `;

    const monthlyMap = new Map<string, { qty: number; item_count: number }>(
      rows.map((row) => [
        this.normalizeYearMonth(row.yearmonth),
        { qty: Number(row.qty ?? 0), item_count: Number(row.item_count) },
      ]),
    );

    return this.buildMonthlyReport(financialYear, monthlyMap, (m) => ({
      จำนวนรายการ: m?.item_count ?? 0,
      tr: m?.qty ?? 0,
      rvalue: 0,
    }));
  }

  async findBalance(dto: SearchDrugItemDetailsDto) {
    // this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.db1prisma.drugItemStocks.groupBy({
      by: ['yearmonth'],
      where: {drugItemCodeId: Number(dto.id), yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { ttr: true, bal_value: true },
    });

    // const groupedMap = this.toYearMonthMap(grouped);
    const groupedMap = this.toYearMonthMap<(typeof grouped)[number]>(grouped);
    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      ttr: g?._sum.ttr ?? 0,
      rvalue: this.round2(Number(g?._sum.bal_value ?? 0)),
    }));
  }



  // ---------- Shared reporting helpers ----------

  /**
   * กันบั๊ก: ถ้า dto.icode เป็น undefined, Prisma จะตัด field นี้ออกจาก where
   * โดยไม่ error แล้วกลายเป็น query ทั้งตาราง (ทุก icode) แบบเงียบๆ
   * ต้องเช็คให้ fail ทันทีแทนที่จะปล่อยให้ query ผิดขอบเขตแบบไม่รู้ตัว
   */
  // private assertIcode(dto: SearchDashboardDto): void {
  //   if (!dto.icode) {
  //     throw new BadRequestException('icode is required');
  //   }
  // }

  /**
   * เติมรายงานรายเดือนให้ครบทุกเดือนของปีงบประมาณที่ "มองเห็นได้" (ไม่เกินเดือนตัดรอบ)
   * โดยดึงข้อมูลจาก map ที่ group ตาม yearmonth ไว้แล้ว เดือนไหนไม่มีข้อมูลจะได้ค่าจาก mapRow(undefined)
   */
  private buildMonthlyReport<T>(
    financialYear: number,
    groupedByYearMonth: Map<string, T>,
    mapRow: (data: T | undefined) => Record<string, unknown>,
  ) {
    const visibleMonths = this.getVisibleFiscalMonths(financialYear);

    return visibleMonths.map((yearmonth) => ({
      yearmonth,
      ปีงบประมาณ: financialYear,
      เดือน: this.formatThaiMonthLabel(yearmonth),
      ...mapRow(groupedByYearMonth.get(this.normalizeYearMonth(yearmonth))),
    }));
  }

  /** แปลงผลลัพธ์จาก prisma.groupBy(by: ['yearmonth']) ให้เป็น Map ค้นหาได้เร็วด้วย yearmonth ที่ normalize แล้ว */
  private toYearMonthMap<T extends YearMonthRow>(rows: T[]): Map<string, T> {
    return new Map(
      rows
        .filter(
          (row): row is T & { yearmonth: string } => row.yearmonth !== null,
        )
        .map((row) => [this.normalizeYearMonth(row.yearmonth), row]),
    );
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
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

  // "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน เช่น วันนี้อยู่ ส.ค. -> เดือนตัดรอบคือ ก.ค. (format YYYYMM)
  private getCutoffYearMonth(): string {
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${cutoffDate.getFullYear()}${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
  }

  // เดือนทั้งหมดของปีงบ ที่ไม่เกินเดือนตัดรอบ (ตัดเดือนที่ยังไม่ถึงออก)
  private getVisibleFiscalMonths(financialYear: number): string[] {
    const cutoffYearMonth = this.getCutoffYearMonth();
    return this.getFiscalYearMonths(financialYear).filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
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
}
