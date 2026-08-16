import * as crypto from 'crypto';

export function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  if (!hash) return Promise.resolve(false);

  const computed = crypto
    .createHash('md5')
    .update(Buffer.from(password, 'latin1'))
    .digest('hex')
    .toUpperCase();

  return Promise.resolve(computed === hash.toUpperCase());
}
