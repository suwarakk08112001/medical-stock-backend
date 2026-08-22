import { Global, Module } from '@nestjs/common';
import { DB1PrismaService } from './db1-prisma.service';
import { DB2PrismaService } from './db2-prisma.service';

@Global()
@Module({
  providers: [DB1PrismaService, DB2PrismaService],
  exports: [DB1PrismaService, DB2PrismaService],
})
export class PrismaModule {}