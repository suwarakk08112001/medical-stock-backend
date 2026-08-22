import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Opduser } from 'generated/db1/client';
interface AuthenticatedRequest {
  opduser: Opduser;
}

interface CurrentOpdUser {
  loginname: string;
  // ถ้ามี property อื่นก็ใส่เพิ่มได้
}

export const CurrentOpdUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Opduser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.opduser;
  },
);
