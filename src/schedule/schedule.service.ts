import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { DB2PrismaService } from 'src/prisma/db2-prisma.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  private isRunning = false; // ★ flag กันการรันซ้อน

  constructor(
    private db1prisma: DB1PrismaService,
    private db2prisma: DB2PrismaService,
  ) {
    this.logger.log('✅ ScheduleService initialized');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async CreateDrugStockOutRollback() {
    if (this.isRunning) {
      this.logger.warn('⏭️ Previous job still running, skipping');
      return;
    }
    this.isRunning = true;

    try {
      await this.processHOSxP();
     await this.processHOSxPPCU();  
      this.logger.log('✅ Rollback processing completed (HOSxP + HOSxP PCU)');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error('❌ Error:', error.message);
        this.logger.error('❌ Stack:', error.stack);
      } else {
        this.logger.error('❌ Unknown Error:', String(error));
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async processHOSxP() {
    // ★ ใช้ totalDrugItemHOSs (drugItemCodeId-based) แทน totaldrugItemHos (icode-based) เดิม
    //   ต้อง include drugItemCodes เพื่อเอา icode มา query opitemrece ต่อ เพราะ opitemrece
    //   ผูกกับ icode เท่านั้น ไม่มี drugItemCodeId ให้ join ตรงๆ
    const result = await this.db1prisma.totalDrugItemHOSs.findMany({
      include: {
        drugItemCodes: {
          select: { id: true, icode: true, invcode: true, unit: true },
        },
      },
    });
  
    this.logger.log(`🔍 Found ${result.length} records`);
  
    if (result.length === 0) {
      this.logger.log('⚠️ No records found');
      return;
    }
  
    for (const t of result) {
      const icode = t.drugItemCodes.icode;
      const drugItemCodeId = t.drugItemCodeId;
  
      // ★ ต้อง query opitemrece แยกต่างหาก (ไม่ใช่ include เหมือนเดิม) เพราะ totalDrugItemHOSs
      //   ไม่มี relation ตรงไปยัง opitemrece — เชื่อมได้แค่ผ่าน icode ที่ดึงมาจาก drugItemCodes
      const opitemreceList = await this.db1prisma.opitemrece.findMany({
        where: {
          icode,
          vstdate: {
            gte: new Date('2026-08-01'),
            lte: new Date(),
          },
          transactionDrugRollbacks: {   // ★ แก้ B → b
            none: {},
          },
        },
      });
  
      if (opitemreceList.length === 0) continue;
  
      const sortedOp = [...opitemreceList].sort((a, b) => {
        const dateA = a.vstdate ? a.vstdate.getTime() : 0;
        const dateB = b.vstdate ? b.vstdate.getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.vsttime ? a.vsttime.getTime() : 0;
        const timeB = b.vsttime ? b.vsttime.getTime() : 0;
        return timeA - timeB;
      });
  
      if (sortedOp.length === 0) continue;
  
      let currentQty = t.qty;
  
      await this.db1prisma.$transaction(async (tx) => {
        for (const op of sortedOp) {
          const qtySystem = op.qty ?? 0;
          const totalStockIn = currentQty - qtySystem;
  
          // ★ เช็คก่อน insert ว่ามี hos_guid นี้อยู่แล้วหรือยัง (กันซ้ำแบบชัวร์ที่สุด)
          const existing = await tx.transactionDrugRollbacks.findFirst({
            where: { hos_guid: op.hos_guid },
            select: { id: true }, 
          });
  
          if (existing) {
            this.logger.warn(`⚠️ hos_guid ${op.hos_guid} already exists, skip`);
            currentQty = totalStockIn; // ยังต้องอัปเดต currentQty เพื่อคำนวณต่อให้ถูกต้อง แม้ข้าม insert
            continue;
          }
  
          // ★ update totalDrugItemHOSs (โมเดลใหม่) แทน totaldrugItemHos เดิม
          await tx.totalDrugItemHOSs.update({
            where: { id: t.id },
            data: { qty: totalStockIn },
          });
  
          try {
            await tx.transactionDrugRollbacks.create({
              data: {
                hos_guid: op.hos_guid,
                vn: op.vn,
                hn: op.hn,
                an: op.an,
                icode: op.icode,
                drugItemCodeId,               // ★ แทน icode ตรงๆ
                unit: t.drugItemCodes.unit,   // ★ unit อยู่ที่ drugItemCodes ไม่ใช่ totalDrugItemHOSs
                stockIn: currentQty,
                stockOut: qtySystem,
                totalStockIn: totalStockIn,
                vstdate: op.vstdate,
                // ★ ไม่มี category แล้ว — โมเดลใหม่ไม่มี field นี้
              },
            });
          } catch (err: any) {
            if (err.code === 'P2002') {
              this.logger.warn(
                `⚠️ hos_guid ${op.hos_guid} race condition, skip`,
              );
            } else {
              throw err;
            }
          }
  
          currentQty = totalStockIn;
        }
      });
  
      this.logger.log(
        `✅ icode ${icode}: processed ${sortedOp.length} transactions, final qty = ${currentQty}`,
      );
    }
  
    this.logger.log('✅ Rollback processing completed');
  }

  private async processHOSxPPCU() {
    const result = await this.db1prisma.totalDrugItemHOSs.findMany({
      include: { drugItemCodes: true }, // ★ ต้อง include relation มาด้วย ไม่งั้น field นี้จะเป็น undefined ตอน runtime
    });
  
    if (result.length === 0) {
      this.logger.log('⚠️ No records found');
      return;
    }
  
    // ★ เปลี่ยนจาก d.icode -> d.drugItemCodes.icode
    const icodes = result
      .map((d) => d.drugItemCodes?.icode)
      .filter((icode): icode is string => icode !== null && icode !== undefined);
  
    const opItems = await this.db2prisma.opitemrece.findMany({
      where: {
        icode: { in: icodes },
        vstdate: {
          gte: new Date('2026-08-01'),
          lte: new Date(),
        },
      },
    });
  
    const opGuids = opItems.map((op) => op.hos_guid);
    const existingRollbacks = await this.db2prisma.transactionDrugRollBack.findMany({
      where: { hos_guid: { in: opGuids } },
      select: { hos_guid: true },
    });
    const existingGuidSet = new Set(existingRollbacks.map((r) => r.hos_guid));
  
    const opByIcode = new Map<string, typeof opItems>();
    for (const op of opItems) {
      if (!op.icode) continue;                     // ★ กัน null
      if (existingGuidSet.has(op.hos_guid)) continue;
      if (!opByIcode.has(op.icode)) opByIcode.set(op.icode, []);
      opByIcode.get(op.icode)!.push(op);
    }
  
    this.logger.log(`🔍 Found ${result.length} records`);
  
    for (const t of result) {
      if (!t.drugItemCodes.icode) continue;                       // ★ กัน null
      const opList = opByIcode.get(t.drugItemCodes.icode) ?? [];
      if (opList.length === 0) continue;
  
      const sortedOp = [...opList].sort((a, b) => {
        const dateA = a.vstdate ? a.vstdate.getTime() : 0;
        const dateB = b.vstdate ? b.vstdate.getTime() : 0;
        if (dateA !== dateB) return dateA - dateB;
        const timeA = a.vsttime ? a.vsttime.getTime() : 0;
        const timeB = b.vsttime ? b.vsttime.getTime() : 0;
        return timeA - timeB;
      });
  
      let currentQty = t.qty;
  
      for (const op of sortedOp) {
        const qtySystem = op.qty ?? 0;
        const totalStockIn = currentQty - qtySystem;
      
  
        const existing = await this.db2prisma.transactionDrugRollBack.findUnique({
          where: { hos_guid: op.hos_guid },
        });

        console.log(existing);
  
        if (existing) {
          this.logger.warn(`⚠️ hos_guid ${op.hos_guid} already exists, skip`);
          currentQty = totalStockIn;
          continue;
        }
  
        await this.db1prisma.totalDrugItemHOSs.update({
          where: { id: t.id },
          data: { qty: totalStockIn },
        });
  
        try {
          await this.db2prisma.transactionDrugRollBack.create({
            data: {
              hos_guid: op.hos_guid,
              vn: op.vn,
              hn: op.hn,
              an: op.an,
              icode: op.icode,
              stockIn: currentQty,
              stockOut: qtySystem,
              totalStockIn: totalStockIn,
              vstdate: op.vstdate,
            },
          });
        } catch (err: any) {
          if (err.code === 'P2002') {
            this.logger.warn(`⚠️ hos_guid ${op.hos_guid} race condition, skip`);
          } else {
            throw err;
          }
        }
  
        currentQty = totalStockIn;
      }
  
      // this.logger.log(
      //   `✅ icode ${t.icode}: processed ${sortedOp.length} transactions, final qty = ${currentQty}`,
      // );
    }
  
    this.logger.log('✅ Rollback processing completed');
  }
}
