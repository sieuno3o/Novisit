import { redisClient } from '../../index';

type ProviderName = 'kakao' | 'discord';

// Provider(카카오/디스코드)의 AccessToken과 RefreshToken을 Redis에 저장.
export const storeProviderTokens = async (
  userId: string,
  providerName: ProviderName,
  accessToken: string,
  refreshToken?: string
): Promise<void> => {
  // Redis 키를 생성. ex: "token:12345:kakao:accessToken"
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  await redisClient.set(accessTokenKey, accessToken);

  if (refreshToken) {
    const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;
    await redisClient.set(refreshTokenKey, refreshToken);
  }
};

// Provider의 AccessToken과 RefreshToken을 Redis에서 가져옴.
export const getProviderTokens = async (
  userId: string,
  providerName: ProviderName
): Promise<{ accessToken: string | null; refreshToken: string | null }> => {
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;

  const [accessToken, refreshToken] = await Promise.all([
    redisClient.get(accessTokenKey),
    redisClient.get(refreshTokenKey),
  ]);

  return { accessToken, refreshToken };
};
