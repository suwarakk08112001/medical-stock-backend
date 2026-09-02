import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepositories } from './auth.repositories';
import { DB1PrismaService } from 'src/prisma/db1-prisma.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/common/guard/jwt/jwt-strategy';
import { LocalStrategy } from 'src/common/guard/local/local-strategy';
import { ExceptionModule } from 'src/common/exception/exception.module';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }), // กำหนด default ถ้าต้องการ
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
    ExceptionModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepositories,
    DB1PrismaService,
    JwtStrategy,
    LocalStrategy,
  ],
})
export class AuthModule {}
