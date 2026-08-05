import * as crypto from 'crypto';

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return false;

  const computed = crypto
    .createHash('md5')
    .update(Buffer.from(password, 'latin1'))
    .digest('hex')
    .toUpperCase();

  return computed === hash.toUpperCase(); // md5 = 32 ตัว ≠ 86 ตัว → false เสมอ
}
