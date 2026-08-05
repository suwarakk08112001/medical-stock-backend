import { SetMetadata } from '@nestjs/common';

export const Roles = (...groupname: string[]) =>
  SetMetadata('groupname', groupname);
