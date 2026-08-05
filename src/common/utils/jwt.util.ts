import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config(); // <--- บรรทัดนี้ต้องอยู่บนสุด ห้ามย้าย!
export interface JwtPayload {
  loginname: string;
  name?: string;
  passwordweb?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateTokens = (
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
): TokenPair => {
  const accessToken = jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key',
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    } as jwt.SignOptions,
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as jwt.SignOptions,
  );

  return { accessToken, refreshToken };
};

// export const verifyAccessToken = (token: string): JwtPayload => {
//   return jwt.verify(token, jwtConfig.accessSecret) as JwtPayload;
// };

export const verifyRefreshToken = (token: string): JwtPayload => {
  // แก้ไขตรงนี้: cast ผ่าน unknown ก่อน
  return jwt.verify(
    token,
    process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
  ) as unknown as JwtPayload;
};

// export const refreshTokens = (refreshToken: string): TokenPair => {
//   const payload = verifyRefreshToken(refreshToken);

//   const { iat: _iat, exp: _exp, ...tokenPayload } = payload;

//   return generateTokens(tokenPayload);
// };
