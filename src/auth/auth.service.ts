import { Injectable } from '@nestjs/common';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RefreshTokenDto } from './dto/refresh-auth.dto';
import { AuthRepositories } from './auth.repositories';
import { ExceptionService } from 'src/common/exception/exception.service';
import { comparePassword } from 'src/common/utils/crypto.util';
import { generateTokens, verifyRefreshToken } from 'src/common/utils/jwt.util';
import { MESSAGE } from 'src/common/message';
import { toAuthResponse } from './dto/response-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepositories: AuthRepositories,
    private readonly exceptionService: ExceptionService,
  ) {}

  async login(loginAuthDto: LoginAuthDto) {
    const opduser = await this.authRepositories.findByloginname(
      loginAuthDto.loginname,
    );
    if (!opduser) {
      this.exceptionService.throwInvalidLoginName();
    }

    const isMatches = await comparePassword(
      loginAuthDto.passweb,
      String(opduser.passweb),
    );

    if (!isMatches) {
      this.exceptionService.throwInvalidPassword();
    }
    const token = generateTokens({
      loginname: opduser.loginname,
      name: String(opduser.name),
      // password:opduser.password,
      passwordweb: String(opduser.passweb),
    });
    return {
      opduser: toAuthResponse(opduser),
      ...token,
      message: MESSAGE.AUTH.LOGIN_SUCCESS,
    };
  }

  async refresh(renewTokenDto: RefreshTokenDto) {
    try {
      const payload = verifyRefreshToken(renewTokenDto.refreshToken);
      const user = await this.authRepositories.findByloginname(
        payload.loginname,
      );

      if (!user) {
        this.exceptionService.throwInvalidRefreshToken();
      }

      // สร้าง object ใหม่จาก payload
      const tokenPayload = { ...payload };

      // ลบตัวที่ไม่อยากให้ติดไปใน Token ใหม่ (ไม่ต้องประกาศตัวแปร iat, exp มารับ)
      delete tokenPayload.iat;
      delete tokenPayload.exp;

      const tokens = generateTokens(tokenPayload);

      return {
        token: tokens,
        message: MESSAGE.AUTH.REFRESH_TOKEN_SUCCESS,
      };
    } catch {
      this.exceptionService.throwInvalidRefreshToken();
    }
  }
}
