import { Injectable } from '@nestjs/common';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { ResponseLoginDto } from './dto/response-auth.dto';

@Injectable()
export class AuthRepositories {
  constructor(private db1prisma: DB1PrismaService) {}
  async findByloginname(loginname: string): Promise<ResponseLoginDto | null> {
    return this.db1prisma.opduser.findFirst({
      where: {
        loginname: loginname,
      },
    });
  }
}
