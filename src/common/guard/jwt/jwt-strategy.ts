import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

import { jwtConstants } from '../constant/constant';
import { JwtPayload } from 'src/common/utils/jwt.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.atSecret, // ใช้ AT Secret
    });
  }

  validate(payload: JwtPayload) {
    return {
      loginname: payload.loginname,
      name: payload.name,
      passwordweb: payload.passwordweb,
    };
  }
}
