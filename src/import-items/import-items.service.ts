import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { UpdateImportItemDto } from './dto/update-import-item.dto';
import { PrismaService } from 'src/prisma/prisma.service';

interface ImportExcelRow {
  CODE1?: string | number | null;
  MPack?: string | number | null;
  Unit?: string | number | null;
  TRemaine?: string | number | null;
  RemaineValue?: string | number | null;
  TR?: string | number | null;
  RValue?: string | number | null;
  TD?: string | number | null;
  DValue?: string | number | null;
  TTR?: string | number | null;
  BalValue?: string | number | null;
  YearMonth?: string | number | null;
}

export interface SkippedRow {
  row: number;
  reason: string;
  data: ImportExcelRow;
}

@Injectable()
export class ImportItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('sheet names:', workbook.SheetNames);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<ImportExcelRow>(worksheet, {
      defval: null,
      raw: false,
    });

    if (!rows.length) {
      throw new BadRequestException('ไฟล์ Excel ไม่มีข้อมูล');
    }

    const skipped: SkippedRow[] = [];
    let totaldrugitemInsertedCount = 0;
    let totaldrugitemUpdatedCount = 0;
    let balanceInsertedCount = 0;
    let balanceUpdatedCount = 0;
    let carrydrugitemInsertedCount = 0;
    let carrydrugitemUpdatedCount = 0;
    let importdrugitemInsertedCount = 0;
    let importdrugitemUpdatedCount = 0;
    const exportdrugitemInsertedCount = 0;
    let exportdrugitemUpdatedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNo = index + 2;

      const invcodeRaw = row.CODE1;
      const mpackRaw = row.MPack;
      const unitRaw = row.Unit;
      const tremainRaw = row.TRemaine;
      const remainvalueRaw = row.RemaineValue;
      const trRaw = row.TR;
      const rvalueRaw = row.RValue;
      const tdRaw = row.TD;
      const dvalueRaw = row.DValue;
      const qtyRaw = row.TTR;
      const balvalueRaw = row.BalValue;
      const yearmonthRaw = row.YearMonth;

      const invcode = invcodeRaw != null ? String(invcodeRaw).trim() : null;
      const mpack = mpackRaw != null ? Number(mpackRaw) : NaN;
      const unit = unitRaw != null ? String(unitRaw).trim() : null;
      const tremain = tremainRaw != null ? Number(tremainRaw) : NaN;
      const remainvalue = remainvalueRaw != null ? Number(remainvalueRaw) : NaN;
      const tr = trRaw != null ? Number(trRaw) : NaN;
      const rvalue = rvalueRaw != null ? Number(rvalueRaw) : NaN;
      const td = tdRaw != null ? Number(tdRaw) : NaN;
      const dvalue = dvalueRaw != null ? Number(dvalueRaw) : NaN;
      const qty = qtyRaw != null ? Number(qtyRaw) : NaN;
      const balvalue = balvalueRaw != null ? Number(balvalueRaw) : NaN;

      const yearmonth =
        yearmonthRaw != null ? String(yearmonthRaw).trim() : null;

      if (!invcode) {
        skipped.push({ row: rowNo, reason: 'CODE1 ว่าง', data: row });
        continue;
      }

      if (Number.isNaN(mpack)) {
        skipped.push({ row: rowNo, reason: 'MPack ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(tr)) {
        skipped.push({ row: rowNo, reason: 'tr ไม่ใช่ตัวเลข', data: row });
        continue;
      }

      if (Number.isNaN(rvalue)) {
        skipped.push({ row: rowNo, reason: 'rvalue ไม่ใช่ตัวเลข', data: row });
        continue;
      }

      if (Number.isNaN(qty)) {
        skipped.push({ row: rowNo, reason: 'TTR ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(balvalue)) {
        skipped.push({
          row: rowNo,
          reason: 'BalValue ไม่ใช่ตัวเลข',
          data: row,
        });
        continue;
      }
      if (!yearmonth) {
        skipped.push({ row: rowNo, reason: 'YearMonth ว่าง', data: row });
        continue;
      }

      // ใช้ qty ที่ validate แล้ว (ไม่ใช่ qtyRaw ดิบ) ในการคำนวณ
      const tqty = qty * mpack;

      const total_tr = tr * mpack;

      const total_td = td * mpack;

      const total_tremain = tremain * mpack;

      try {
        // 1) หา icode จาก invcode ในตาราง drugitems
        const drugitem = await this.prisma.drugitems.findFirst({
          where: { invcode },
          select: { icode: true },
        });

        if (!drugitem || !drugitem.icode) {
          skipped.push({
            row: rowNo,
            reason: `ไม่พบ icode ที่ตรงกับ invcode "${invcode}" ในตาราง drugitems`,
            data: row,
          });
          continue;
        }

        const { icode } = drugitem;

        // 2) เช็คว่ามี icode + invcode นี้ใน totaldrugitem แล้วหรือยัง
        const existingdrugitemcode = await this.prisma.drugitemcode.findFirst({
          where: { icode, invcode },
        });

        if (existingdrugitemcode) {
          await this.prisma.drugitemcode.update({
            where: { id: existingdrugitemcode.id },
            data: { mpack, unit: String(unit) },
          });
          totaldrugitemUpdatedCount++;
        } else {
          await this.prisma.drugitemcode.create({
            data: { icode, invcode, mpack, unit: String(unit) },
          });
          totaldrugitemInsertedCount++;
        }

        const existingcarrytotaldrug =
          await this.prisma.carrydrugitem.findFirst({
            where: { icode, invcode, yearmonth },
          });

        if (existingcarrytotaldrug) {
          await this.prisma.carrydrugitem.update({
            where: { id: existingcarrytotaldrug.id },
            data: {
              mpack,
              unit,
              tremain: total_tremain,
              remainvalue,
            },
          });
          carrydrugitemUpdatedCount++;
        } else {
          await this.prisma.carrydrugitem.create({
            data: {
              icode,
              invcode,
              mpack,
              unit,
              tremain: total_tremain,
              remainvalue,
              yearmonth,
            },
          });
          carrydrugitemInsertedCount++;
        }

        const existingimporttotaldrug =
          await this.prisma.importdrugitem.findFirst({
            where: { icode, invcode, yearmonth },
          });

        if (existingimporttotaldrug) {
          await this.prisma.importdrugitem.update({
            where: { id: existingimporttotaldrug.id },
            data: {
              mpack,
              unit,
              tr: total_tr,
              rvalue,
            },
          });
          importdrugitemUpdatedCount++;
        } else {
          await this.prisma.importdrugitem.create({
            data: {
              icode,
              invcode,
              mpack,
              unit,
              tr: total_tr,
              rvalue,
              yearmonth,
            },
          });
          importdrugitemInsertedCount++;
        }

        const existingexporttotaldrug =
          await this.prisma.exportdrugitem.findFirst({
            where: { icode, invcode, yearmonth },
          });

        if (existingexporttotaldrug) {
          await this.prisma.exportdrugitem.update({
            where: { id: existingexporttotaldrug.id },
            data: {
              mpack,
              unit,
              td: total_td,
              dvalue,
            },
          });
          exportdrugitemUpdatedCount++;
        } else {
          await this.prisma.exportdrugitem.create({
            data: {
              icode,
              invcode,
              mpack,
              unit,
              td: total_td,
              dvalue,
              yearmonth,
            },
          });
          exportdrugitemUpdatedCount++;
        }

        // 3) หา record ของ inventory แยกต่างหาก ด้วย icode + invcode + yearmonth
        // (ห้ามใช้ existing.id จากขั้นตอนที่ 2 เพราะเป็น id ของ totaldrugitem คนละตารางกัน)
        const existingbalance = await this.prisma.balance.findFirst({
          where: { icode, invcode, yearmonth },
        });

        if (existingbalance) {
          await this.prisma.balance.update({
            where: { id: existingbalance.id },
            data: {
              ttr: tqty,
              mpack,
              unit,
              bal_value: balvalue,
            },
          });
          balanceUpdatedCount++;
        } else {
          await this.prisma.balance.create({
            data: {
              icode,
              invcode,
              ttr: tqty,
              bal_value: balvalue,
              mpack,
              unit,
              yearmonth,
            },
          });
          balanceInsertedCount++;
        }
      } catch (err) {
        // กันไม่ให้แถวเดียวพังทั้งไฟล์ + บันทึกเหตุผลไว้ตรวจสอบ
        skipped.push({
          row: rowNo,
          reason: `เกิดข้อผิดพลาดขณะบันทึกข้อมูล: ${err instanceof Error ? err.message : String(err)}`,
          data: row,
        });
      }
    }

    return {
      totalRows: rows.length,
      totaldrugitemInsertedCount,
      totaldrugitemUpdatedCount,
      carrydrugitemUpdatedCount,
      carrydrugitemInsertedCount,
      importdrugitemInsertedCount,
      importdrugitemUpdatedCount,
      exportdrugitemUpdatedCount,
      exportdrugitemInsertedCount,
      balanceInsertedCount,
      balanceUpdatedCount,
      skippedCount: skipped.length,
      skipped,
    };
  }

  findAll() {
    return `This action returns all importItems`;
  }

  findOne(id: number) {
    return `This action returns a #${id} importItem`;
  }

  update(id: number, updateImportItemDto: UpdateImportItemDto) {
    return `This action updates a #${id} importItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} importItem`;
  }
}
