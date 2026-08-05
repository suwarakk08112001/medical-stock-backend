import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseLoginDto } from './dto/response-auth.dto';

@Injectable()
export class AuthRepositories {
  constructor(private prisma: PrismaService) {}
  async findByloginname(loginname: string): Promise<ResponseLoginDto | null> {
    return this.prisma.opduser.findFirst({
      where: {
        loginname: loginname,
      },
    });
  }
}
