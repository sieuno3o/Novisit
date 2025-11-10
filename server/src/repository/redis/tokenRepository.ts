import { redisClient } from '../../index.js';

type ProviderName = 'kakao' | 'discord';

// Provider(카카오/디스코드)의 AccessToken과 RefreshToken을 Redis에 저장.
export const storeProviderTokens = async (
  userId: string,
  providerName: ProviderName,
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number // 초 단위
): Promise<void> => {
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  await redisClient.set(accessTokenKey, accessToken);
  if (expiresIn) {
    await redisClient.expire(accessTokenKey, expiresIn);
  }

  if (refreshToken) {
    const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;
    await redisClient.set(refreshTokenKey, refreshToken);
  }
};

// Provider의 AccessToken과 RefreshToken을 Redis에서 가져옴.
export const getProviderTokens = async (
  userId: string,
  providerName: ProviderName
): Promise<{ accessToken: string | null; refreshToken: string | null; expiresIn: number | null }> => {
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;

  const [accessToken, refreshToken, expiresIn] = await Promise.all([
    redisClient.get(accessTokenKey),
    redisClient.get(refreshTokenKey),
    redisClient.ttl(accessTokenKey) // Time To Live (남은 만료 시간)
  ]);

  return { accessToken, refreshToken, expiresIn: expiresIn !== -1 ? expiresIn : null };
};

// Provider의 AccessToken과 RefreshToken을 Redis에서 삭제.
export const deleteProviderTokens = async (
  userId: string,
  providerName: ProviderName
): Promise<void> => {
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;

  await Promise.all([
    redisClient.del(accessTokenKey),
    redisClient.del(refreshTokenKey),
  ]);
};