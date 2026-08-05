import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
// import { I18nService } from "nestjs-i18n";
import { MESSAGE } from '../message';

@Injectable()
export class ExceptionService {
  //   constructor(private readonly i18n: I18nService) {}

  // Sender exceptions
  throwInvalidLoginName(): never {
    throw new NotFoundException(MESSAGE.AUTH.LOGINNAME_NOT_FOUND);
  }

  throwInvalidPassword(): never {
    throw new NotFoundException(MESSAGE.AUTH.PASSWORD_NOT_FOUND);
  }

  throwInvalidRefreshToken(): never {
    throw new UnauthorizedException(MESSAGE.AUTH.INVALID_REFRESH_TOKEN);
  }
}
