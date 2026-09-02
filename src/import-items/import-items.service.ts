

import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { UpdateImportItemDto } from './dto/update-import-item.dto';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { DB2PrismaService } from 'src/prisma/db2-prisma.service';

interface ImportExcelRow {
  CODE1?: string | number | null;
  MPack?: string | number | null;
  Unit?: string | number | null;
  TYPE?: string | null;
  TRemaine?: string | number | null;
  RemaineValue?: string | number | null;
  TR?: string | number | null;
  RValue?: string | number | null;
  TD?: string | number | null;
  DValue?: string | number | null;
  TTR?: string | number | null;
  BalValue?: string | number | null;
  // ★ คอลัมน์นี้เก็บ "วันที่ปิดยอด" รูปแบบ dd/mm/yyyy ไม่ใช่ yearmonth ตรงๆ
  YearMonth?: string | number | null;
}

export interface SkippedRow {
  row: number;
  reason: string;
  data: ImportExcelRow;
}

@Injectable()
export class ImportItemsService {
  constructor(
    private readonly db1prisma: DB1PrismaService,
    private readonly db2prisma: DB2PrismaService,
  ) {}

  /**
   * แปลงวันที่รูปแบบ dd/mm/yyyy จาก Excel ให้เป็น Date object (UTC)
   * คืนค่า null ถ้า parse ไม่ได้ หรือวันที่ไม่มีอยู่จริง (เช่น 30/02/2025)
   */
  private parseClosingDate(raw: string): Date | null {
    const parts = raw.trim().split('/');
    if (parts.length !== 3) return null;

    const [mmStr, ddStr, yyStr] = parts; // ★ ลำดับคือ เดือน/วัน/ปี (M/D/YY) ไม่ใช่ วัน/เดือน/ปี
    const month = Number(mmStr);
    const day = Number(ddStr);
    let year = Number(yyStr);

    if (
      Number.isNaN(day) ||
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return null;
    }

    // ★ ขยายปี 2 หลัก (เช่น 26) ให้เป็น 4 หลัก (2026)
    if (yyStr.length === 2) {
      year = year <= 68 ? 2000 + year : 1900 + year;
    }

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }

    return date;
  }
  // private parseClosingDate(raw: string): Date | null {
  //   const parts = raw.trim().split('/');
  //   if (parts.length !== 3) return null;

  //   const [ddStr, mmStr, yyyyStr] = parts;
  //   const day = Number(ddStr);
  //   const month = Number(mmStr);
  //   const year = Number(yyyyStr);

  //   if (
  //     Number.isNaN(day) ||
  //     Number.isNaN(month) ||
  //     Number.isNaN(year) ||
  //     month < 1 ||
  //     month > 12 ||
  //     day < 1 ||
  //     day > 31
  //   ) {
  //     return null;
  //   }

  //   const date = new Date(Date.UTC(year, month - 1, day));

  //   // เช็คว่าวันที่ที่ได้ตรงกับที่ป้อนจริง (กัน overflow เช่น 31/02 -> 03/03)
  //   if (
  //     date.getUTCFullYear() !== year ||
  //     date.getUTCMonth() !== month - 1 ||
  //     date.getUTCDate() !== day
  //   ) {
  //     return null;
  //   }

  //   return date;
  // }

  /** yyyy-mm-dd จาก Date (UTC) สำหรับเก็บ closingdate */
  private toYYYYMMDD(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** yyyymm จาก Date (UTC) สำหรับเก็บ yearmonth */
  private toYYYYMM(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}${m}`;
  }

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
    let drugitemCodeInsertedCount = 0;
    let drugitemCodeUpdatedCount = 0;
    let totaldrugitemHOSUpdatedCount = 0;
    let totaldrugitemHOSInsertedCount = 0;
    let drugItemStockInsertedCount = 0;
    let drugItemStockUpdatedCount = 0;

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
      const closingdateRaw = row.YearMonth;
      const typeRaw = row.TYPE;

      const invcode = invcodeRaw != null
  ? String(invcodeRaw).trim().padStart(7, '0')
  : null;
      const mpack = mpackRaw != null ? Number(mpackRaw) : NaN;
      // const type = typeRaw != null ? String(typeRaw).trim() : null;
      const type = typeRaw != null && String(typeRaw).trim() !== ''
  ? String(typeRaw).trim()
  : null;
      const unit = unitRaw != null ? String(unitRaw).trim() : null;
      const tremain = tremainRaw != null ? Number(tremainRaw) : NaN;
      const remainvalue = remainvalueRaw != null ? Number(remainvalueRaw) : NaN;
      const tr = trRaw != null ? Number(trRaw) : NaN;
      const rvalue = rvalueRaw != null ? Number(rvalueRaw) : NaN;
      const td = tdRaw != null ? Number(tdRaw) : NaN;
      const dvalue = dvalueRaw != null ? Number(dvalueRaw) : NaN;
      const qty = qtyRaw != null ? Number(qtyRaw) : NaN;
      const balvalue =
        balvalueRaw != null && String(balvalueRaw).trim() !== ''
          ? Number(balvalueRaw)
          : 0;

      if (!invcode) {
        skipped.push({ row: rowNo, reason: 'CODE1 ว่าง', data: row });
        continue;
      }
      if (Number.isNaN(mpack)) {
        skipped.push({ row: rowNo, reason: 'MPack ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(tremain)) {
        skipped.push({ row: rowNo, reason: 'TRemaine ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(remainvalue)) {
        skipped.push({
          row: rowNo,
          reason: 'RemaineValue ไม่ใช่ตัวเลข',
          data: row,
        });
        continue;
      }
      if (Number.isNaN(tr)) {
        skipped.push({ row: rowNo, reason: 'TR ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(rvalue)) {
        skipped.push({ row: rowNo, reason: 'RValue ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(td)) {
        skipped.push({ row: rowNo, reason: 'TD ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(dvalue)) {
        skipped.push({ row: rowNo, reason: 'DValue ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(qty)) {
        skipped.push({ row: rowNo, reason: 'TTR ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(balvalue)) {
        skipped.push({ row: rowNo, reason: 'BalValue ไม่ใช่ตัวเลข', data: row });
        continue;
      }

      // ★ แปลงวันที่ dd/mm/yyyy -> closingdate (Date) และ yearmonth (yyyymm)
      if (!closingdateRaw) {
        skipped.push({ row: rowNo, reason: 'YearMonth (วันที่ปิดยอด) ว่าง', data: row });
        continue;
      }
      const closingDateObj = this.parseClosingDate(String(closingdateRaw));
      if (!closingDateObj) {
        skipped.push({
          row: rowNo,
          reason: `YearMonth "${closingdateRaw}" ไม่ใช่วันที่รูปแบบ dd/mm/yyyy ที่ถูกต้อง`,
          data: row,
        });
        continue;
      }
      const closingdate = closingDateObj; // เก็บลง DB เป็น Date -> yyyy-mm-dd
      const yearmonth = this.toYYYYMM(closingDateObj); // yyyymm

      const tqty = qty * mpack;
      const total_tr = tr * mpack;
      const total_td = td * mpack;
      const total_tremain = tremain * mpack;

      try {
        const drugitem = await this.db1prisma.drugitems.findFirst({
          where: { invcode },
          select: { icode: true },
        });

        if (!drugitem || !drugitem.icode) {
          skipped.push({
            row: rowNo,
            reason: `ไม่พบ icode ที่ตรงกับ invcode "${invcode}" ในตาราง drugItems`,
            data: row,
          });
          continue;
        }

        const { icode } = drugitem;

        const result = await this.db1prisma.$transaction(async (tx) => {
          const existingdrugitemcode = await tx.drugItemCodes.findUnique({
            where: { icode_invcode: { icode, invcode } },
          });

          let drugItemCodeId: number;
          let isDrugitemcodeNew: boolean;

          // if (existingdrugitemcode) {
          //   await tx.drugItemCodes.update({
          //     where: { id: existingdrugitemcode.id },
          //     data: { mpack, unit, type: String(type) },
          //   });
          //   drugItemCodeId = existingdrugitemcode.id;
          //   isDrugitemcodeNew = false;
          // } else {
          //   const created = await tx.drugItemCodes.create({
          //     data: { icode, invcode, type: String(type), mpack, unit },
          //   });
          //   drugItemCodeId = created.id;
          //   isDrugitemcodeNew = true;
          // }
          if (existingdrugitemcode) {
            await tx.drugItemCodes.update({
              where: { id: existingdrugitemcode.id },
              data: {
                mpack,
                unit,
                // ถ้า type เป็น null (Excel ไม่มีค่า) ให้คงค่าเดิมไว้ ไม่เขียนทับด้วย "null"
                ...(type !== null ? { type } : {}),
              },
            });
            drugItemCodeId = existingdrugitemcode.id;
            isDrugitemcodeNew = false;
          } else {
            const created = await tx.drugItemCodes.create({
              data: {
                icode,
                invcode,
                type: type ?? '',   // หรือค่า default ที่เหมาะสมตาม schema ของคุณ (ห้ามใช้ String(null))
                mpack,
                unit,
              },
            });
            drugItemCodeId = created.id;
            isDrugitemcodeNew = true;
          }

          // ★ ใช้ yearmonth ที่ derive จาก closingdate ในการหา record เดิม
          const existingDrugItemStock = await tx.drugItemStocks.findFirst({
            where: { drugItemCodeId, closingdate },
          });

          if (existingDrugItemStock) {
            await tx.drugItemStocks.update({
              where: { id: existingDrugItemStock.id },
              data: {
                tremain: total_tremain,
                remainvalue,
                tr: total_tr,
                rvalue,
                td: total_td,
                dvalue,
                ttr: tqty,
                bal_value: balvalue,
                yearmonth,
                closingdate,
              },
            });
          } else {
            await tx.drugItemStocks.create({
              data: {
                drugItemCodeId,
                tremain: total_tremain,
                remainvalue,
                tr: total_tr,
                rvalue,
                td: total_td,
                dvalue,
                ttr: tqty,
                bal_value: balvalue,
                yearmonth,
                closingdate,
              },
            });
          }

          const existingtotaldrugitemHOS = await tx.totalDrugItemHOSs.findFirst({
            where: { drugItemCodeId },
          });

          let isNewHOS: boolean;

          if (existingtotaldrugitemHOS) {
            isNewHOS = false;

            const alreadyRolledBack = await tx.totalDrugHosRollbacks.findFirst({
              where: {
                drugItemCodeId: Number(drugItemCodeId),
                importStock: total_tr,
                closingdate,
              },
            });

            const beforeQty = Number(existingtotaldrugitemHOS.qty);
            const newQty = beforeQty + Number(total_tr);

            if (!alreadyRolledBack) {
              await this.db1prisma.totalDrugItemHOSs.update({
                where: { drugItemCodeId: drugItemCodeId },
                data: { qty: newQty },
              });
              await tx.totalDrugHosRollbacks.create({
                data: {
                  drugItemCodeId: Number(drugItemCodeId),
                  beforestock: beforeQty,
                  importStock: total_tr,
                  totalStockIn: newQty,
                  closingdate,
                },
              });
            }
          } else {
            isNewHOS = true;
            await tx.totalDrugItemHOSs.create({
              data: { drugItemCodeId: Number(drugItemCodeId), qty: tqty },
            });
            await tx.totalDrugHosRollbacks.create({
              data: {
                drugItemCodeId: Number(drugItemCodeId),
                beforestock: 0,
                importStock: tqty,
                totalStockIn: tqty,
                closingdate,
              },
            });
          }

          return {
            isDrugitemcodeNew,
            isStockNew: !existingDrugItemStock,
            isNewHOS,
          };
        });

        if (result.isDrugitemcodeNew) {
          drugitemCodeInsertedCount++;
        } else {
          drugitemCodeUpdatedCount++;
        }

        if (result.isStockNew) {
          drugItemStockInsertedCount++;
        } else {
          drugItemStockUpdatedCount++;
        }

        if (result.isNewHOS) {
          totaldrugitemHOSInsertedCount++;
        } else {
          totaldrugitemHOSUpdatedCount++;
        }
      } catch (err) {
        skipped.push({
          row: rowNo,
          reason: `เกิดข้อผิดพลาดขณะบันทึกข้อมูล: ${err instanceof Error ? err.message : String(err)}`,
          data: row,
        });
      }
    }

    return {
      totalRows: rows.length,
      drugitemCodeInsertedCount,
      drugitemCodeUpdatedCount,
      totaldrugitemHOSInsertedCount,
      totaldrugitemHOSUpdatedCount,
      drugItemStockInsertedCount,
      drugItemStockUpdatedCount,
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