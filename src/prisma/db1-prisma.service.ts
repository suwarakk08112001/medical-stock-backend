import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'generated/db1/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as dotenv from 'dotenv';
dotenv.config(); // <--- บรรทัดนี้ต้องอยู่บนสุด ห้ามย้าย!

@Injectable()
export class DB1PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      adapter: new PrismaMariaDb({
        host: process.env.DB_HOST_1,
        port: Number(process.env.DB_PORT_1),
        user: process.env.DB_USER_1,
        password: process.env.DB_PASS_1,
        database: process.env.DB_NAME_1,
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
