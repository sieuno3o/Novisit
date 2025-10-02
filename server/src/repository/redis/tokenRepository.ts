import { redisClient } from '../../index';

type ProviderName = 'kakao' | 'discord';

//Provider의 AccessToken과 RefreshToken을 Redis에 저장합니다.

export const storeProviderTokens = async (
  userId: string,
  providerName: ProviderName,
  accessToken: string,
  refreshToken?: string
): Promise<void> => {
  const accessTokenKey = `token:${userId}:${providerName}:accessToken`;
  await redisClient.set(accessTokenKey, accessToken);

  if (refreshToken) {
    const refreshTokenKey = `token:${userId}:${providerName}:refreshToken`;
    await redisClient.set(refreshTokenKey, refreshToken);
  }
};
