import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
  @IsString()
  @IsNotEmpty()
  loginname: string;

  @IsString()
  @IsNotEmpty()
  passweb: string;
}
