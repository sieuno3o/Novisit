import { IUser, IOAuthProvider } from '../models/User';
import * as userRepository from '../repository/mongodb/userRepository';
import * as tokenRepository from '../repository/redis/tokenRepository';

type ProviderName = 'kakao' | 'discord';

interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
}

/**
 * Provider 정보를 받아 사용자를 찾거나 생성하고, 소셜 토큰을 Redis에 저장합니다.
 * @param providerName - 'kakao' | 'discord'
 * @param profile - 소셜 로그인 성공 시 받아온 사용자 프로필
 * @returns IUser - 시스템의 사용자 객체
 */
export async function findOrCreateUser(
  providerName: ProviderName,
  profile: UserProfile
): Promise<IUser> {
  // C1: 이미 해당 provider로 로그인한 적 있는지 확인
  let user = await userRepository.findUserByProvider(providerName, profile.id);
  if (user) {
    await tokenRepository.storeProviderTokens(
      user.id,
      providerName,
      profile.accessToken,
      profile.refreshToken
    );
    return user;
  }

  const providerData: IOAuthProvider = {
    provider: providerName,
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
  };

  // C2: 다른 소셜 로그인으로 가입한 이메일이 있는지 확인 (계정 연동)
  if (profile.email) {
    const existingUserByEmail = await userRepository.findUserByEmail(profile.email);
    if (existingUserByEmail) {
      const linkedUser = await userRepository.linkProviderToUser(existingUserByEmail, providerData);
      await tokenRepository.storeProviderTokens(
        linkedUser.id,
        providerName,
        profile.accessToken,
        profile.refreshToken
      );
      return linkedUser;
    }
  }

  // C3: 완전히 새로운 사용자 생성
  if (!profile.email) {
    // 이메일이 없는 경우엔 에러를 발생시키거나, 고유한 임시 이메일을 생성해야 합니다.
    // 여기서는 에러를 발생시키는 것으로 처리합니다.
    throw new Error('Email is required for new user registration.');
  }
  const newUser = await userRepository.createUser(
    profile.email,
    profile.name,
    providerData
  );

  await tokenRepository.storeProviderTokens(
    newUser.id,
    providerName,
    profile.accessToken,
    profile.refreshToken
  );

  return newUser;
}