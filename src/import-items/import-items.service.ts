import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { CreateImportItemDto } from './dto/create-import-item.dto';
import { UpdateImportItemDto } from './dto/update-import-item.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ImportItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    console.log('sheet names:', workbook.SheetNames);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: null,
      raw: false,
    });

    if (!rows.length) {
      throw new BadRequestException('ไฟล์ Excel ไม่มีข้อมูล');
    }

    const skipped: { row: number; reason: string; data: any }[] = [];
    let totaldrugitemInsertedCount = 0;
    let totaldrugitemUpdatedCount = 0;
    let inventoryInsertedCount = 0;
    let inventoryUpdatedCount = 0;

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNo = index + 2;

      const invcodeRaw = row['CODE1'];
      const qtyRaw = row['TTR'];
      const mpackRaw = row['MPack'];
      const unitRaw = row['Unit'];
      const balvalueRaw = row['BalValue'];
      const yearmonthRaw = row['YearMonth'];

      const invcode = invcodeRaw != null ? String(invcodeRaw).trim() : null;
      const qty = qtyRaw != null ? Number(qtyRaw) : NaN;
      const mpack = mpackRaw != null ? Number(mpackRaw) : NaN;
      const balvalue = balvalueRaw != null ? Number(balvalueRaw) : NaN;
      const unit = unitRaw != null ? String(unitRaw).trim() : null;
      const yearmonth = yearmonthRaw != null ? String(yearmonthRaw).trim() : null;

      if (!invcode) {
        skipped.push({ row: rowNo, reason: 'CODE1 ว่าง', data: row });
        continue;
      }
      if (Number.isNaN(qty)) {
        skipped.push({ row: rowNo, reason: 'TTR ไม่ใช่ตัวเลข', data: row });
        continue;
      }
      if (Number.isNaN(mpack)) {
        skipped.push({ row: rowNo, reason: 'MPack ไม่ใช่ตัวเลข', data: row });
        continue;
      }
     
      if (!yearmonth) {
        skipped.push({ row: rowNo, reason: 'YearMonth ว่าง', data: row });
        continue;
      }
      if (Number.isNaN(balvalue)) {
        skipped.push({ row: rowNo, reason: 'BalValue ไม่ใช่ตัวเลข', data: row });
        continue;
      }

      // ใช้ qty ที่ validate แล้ว (ไม่ใช่ qtyRaw ดิบ) ในการคำนวณ
      const tqty = qty * mpack;

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
        const existing = await this.prisma.totaldrugitem.findFirst({
          where: { icode, invcode },
        });

        if (existing) {
          await this.prisma.totaldrugitem.update({
            where: { id: existing.id },
            data: { qty: tqty, mpack, unit:String(unit) },
          });
          totaldrugitemUpdatedCount++;
        } else {
          await this.prisma.totaldrugitem.create({
            data: { icode, invcode, qty: tqty, mpack,unit:String(unit) },
          });
          totaldrugitemInsertedCount++;
        }

        // 3) หา record ของ inventory แยกต่างหาก ด้วย icode + invcode + yearmonth
        // (ห้ามใช้ existing.id จากขั้นตอนที่ 2 เพราะเป็น id ของ totaldrugitem คนละตารางกัน)
        const existingInventory = await this.prisma.inventory.findFirst({
          where: { icode, invcode, yearmonth },
        });

        if (existingInventory) {
          await this.prisma.inventory.update({
            where: { id: existingInventory.id },
            data: {
              ttr: tqty,
              mpack,
              unit,
              bal_value: balvalue,
            },
          });
          inventoryUpdatedCount++;
        } else {
          await this.prisma.inventory.create({
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
          inventoryInsertedCount++;
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
      inventoryInsertedCount,
      inventoryUpdatedCount,
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