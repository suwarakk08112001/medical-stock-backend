import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from 'src/backoffice/auth/auth.service';
import { LoginAuthDto } from 'src/backoffice/auth/dto/login-auth.dto';
import { Body } from '@nestjs/common';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(@Body() loginAuthDto: LoginAuthDto) {
    const opduser = await this.authService.login(loginAuthDto);
    if (!opduser) {
      throw new UnauthorizedException({
        message: ['Something is wrong I can feel it'],
      });
    }
    return opduser;
  }
}
