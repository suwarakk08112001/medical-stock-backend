import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'generated/db2/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
dotenv.config(); // <--- บรรทัดนี้ต้องอยู่บนสุด ห้ามย้าย!

@Injectable()
export class DB2PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaMariaDb({
        host: process.env.DB_HOST_2,
        port: Number(process.env.DB_PORT_2),
        user: process.env.DB_USER_2,
        password: process.env.DB_PASS_2,
        database: process.env.DB_NAME_2,
      }),
    });
  }
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
