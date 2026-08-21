
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { SearchDashboardDto } from './dto/seach-dashboard.dto';
import { PrismaService } from 'src/prisma/prisma.service';

/** แถวที่มี field yearmonth แบบ nullable (ใช้ constrain generic helper) */
interface YearMonthRow {
  yearmonth: string | null;
}

@Injectable()
export class BackofficeDashboardService {
  constructor(private prisma: PrismaService) {}

  create(createDashboardDto: CreateDashboardDto) {
    return 'This action adds a new dashboard';
  }

  async findBalanceByIcode(icode: string) {
    if (!icode) {
      throw new BadRequestException('icode is required');
    }

    const [record, aggregated] = await Promise.all([
      this.prisma.balance.findFirst({
        where: { icode },
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
      this.prisma.balance.aggregate({
        where: { icode },
        _sum: {
          ttr: true,
          bal_value: true,
        },
      }),
    ]);

    return {
      icode: record?.icode ?? icode,
      invcode: record?.invcode ?? null,
      mpack: record?.mpack ?? null,
      unit: record?.unit ?? null,
      name: record?.drugitem?.name ?? null,
      strength: record?.drugitem?.strength ?? null,
      units: record?.drugitem?.units ?? null,
      ttr: aggregated._sum.ttr ?? 0,
      bal_value: aggregated._sum.bal_value ?? 0,
    };
  }

  async findCarry(dto: SearchDashboardDto) {
    this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.prisma.carrydrugitem.groupBy({
      by: ['yearmonth'],
      where: { icode: dto.icode, yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { tremain: true, remainvalue: true },
    });

    const groupedMap = this.toYearMonthMap(grouped);

    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tremain: g?._sum.tremain ?? 0,
      remainvalue: this.round2(Number(g?._sum.remainvalue ?? 0)),
    }));
  }

  async findImport(dto: SearchDashboardDto) {
    this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.prisma.importdrugitem.groupBy({
      by: ['yearmonth'],
      where: { icode: dto.icode, yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { tr: true, rvalue: true },
    });

    const groupedMap = this.toYearMonthMap(grouped);

    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tr: g?._sum.tr ?? 0,
      rvalue: this.round2(Number(g?._sum.rvalue ?? 0)),
    }));
  }

  async findExport(dto: SearchDashboardDto) {
    this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.prisma.exportdrugitem.groupBy({
      by: ['yearmonth'],
      where: { icode: dto.icode, yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { td: true, dvalue: true },
    });

    const groupedMap = this.toYearMonthMap(grouped);

    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      tr: g?._sum.td ?? 0,
      rvalue: this.round2(Number(g?._sum.dvalue ?? 0)),
    }));
  }

  async findExportHosxP(dto: SearchDashboardDto) {
    this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    // opitemrece.vstdate เป็น Date จริง ไม่มี yearmonth ให้ group ตรงๆ เหมือนตารางอื่น
    // เติมวันที่ให้ครบก่อนเทียบ แล้วให้ DB group เป็นรายเดือนเลยผ่าน DATE_FORMAT (เร็วกว่าดึงรายวันมารวมฝั่ง service)
    const startDate = `${start}-01`;
    const endDate = `${end}-30`;

    const rows = await this.prisma.$queryRaw<
      { yearmonth: string; item_count: bigint; qty: string | null }[]
    >`
      SELECT
        DATE_FORMAT(vstdate, '%Y-%m') AS yearmonth,
        COUNT(*) AS item_count,
        SUM(qty) AS qty
      FROM opitemrece
      WHERE icode = ${dto.icode}
        AND vstdate >= ${startDate}
        AND vstdate <= ${endDate}
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

  async findBalance(dto: SearchDashboardDto) {
    this.assertIcode(dto);
    const financialYear = dto.financialYear ?? this.getCurrentFiscalYear();
    const { start, end } = this.getFiscalYearRange(financialYear);

    const grouped = await this.prisma.balance.groupBy({
      by: ['yearmonth'],
      where: { icode: dto.icode, yearmonth: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { ttr: true, bal_value: true },
    });

    const groupedMap = this.toYearMonthMap(grouped);

    return this.buildMonthlyReport(financialYear, groupedMap, (g) => ({
      จำนวนรายการ: g?._count._all ?? 0,
      ttr: g?._sum.ttr ?? 0,
      rvalue: this.round2(Number(g?._sum.bal_value ?? 0)),
    }));
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

  // ---------- Shared reporting helpers ----------

  /**
   * กันบั๊ก: ถ้า dto.icode เป็น undefined, Prisma จะตัด field นี้ออกจาก where
   * โดยไม่ error แล้วกลายเป็น query ทั้งตาราง (ทุก icode) แบบเงียบๆ
   * ต้องเช็คให้ fail ทันทีแทนที่จะปล่อยให้ query ผิดขอบเขตแบบไม่รู้ตัว
   */
  private assertIcode(dto: SearchDashboardDto): void {
    if (!dto.icode) {
      throw new BadRequestException('icode is required');
    }
  }

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
        .filter((row): row is T & { yearmonth: string } => row.yearmonth !== null)
        .map((row) => [this.normalizeYearMonth(row.yearmonth), row]),
    );
  }

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
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
  private getFiscalYearRange(financialYear: number): { start: string; end: string } {
    const endGYear = this.toGregorianYear(financialYear);
    const startGYear = endGYear - 1;
    return {
      start: `${startGYear}-10`, // เช่น "2025-10"
      end: `${endGYear}-09`, // เช่น "2026-09"
    };
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

  // "เดือนตัดรอบ" = เดือนก่อนหน้าเดือนปัจจุบัน 1 เดือน เช่น วันนี้อยู่ ส.ค. -> เดือนตัดรอบคือ ก.ค.
  private getCutoffYearMonth(): string {
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}`;
  }

  // เดือนทั้งหมดของปีงบ ที่ไม่เกินเดือนตัดรอบ (ตัดเดือนที่ยังไม่ถึงออก)
  private getVisibleFiscalMonths(financialYear: number): string[] {
    const cutoffYearMonth = this.getCutoffYearMonth();
    return this.getFiscalYearMonths(financialYear).filter(
      (yearmonth) => this.normalizeYearMonth(yearmonth) <= cutoffYearMonth,
    );
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
}