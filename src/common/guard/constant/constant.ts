export const jwtConstants = {
  atSecret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key',
  rtSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
};
