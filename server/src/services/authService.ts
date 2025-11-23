import { IUser, IOAuthProvider } from '../models/User.js';
import * as userRepository from '../repository/mongodb/userRepository.js';
import * as tokenRepository from '../repository/redis/tokenRepository.js';

type ProviderName = 'kakao' | 'discord';

interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  scopes?: string[];
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // 초 단위
}

// Provider 정보를 받아 사용자를 찾거나 생성하고 소셜 토큰을 Redis에 저장
export async function findOrCreateUser(
  providerName: ProviderName,
  profile: UserProfile
): Promise<IUser> {
  // 이미 해당 provider로 로그인한 적 있는지 확인
  let user = await userRepository.findUserByProvider(providerName, profile.id);
  if (user) {
    await tokenRepository.storeProviderTokens(
      user.id,
      providerName,
      profile.accessToken,
      profile.refreshToken,
      profile.expiresIn
    );
    return user;
  }

  // 새로운 사용자를 위한 provider 데이터 생성
  const providerData: IOAuthProvider = {
    provider: providerName,
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
    talk_message_enabled: providerName === 'kakao',
  };


  // 완전히 새로운 사용자 생성
  if (!profile.email) {
    throw new Error('이메일 정보가 필요합니다.');
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
    profile.refreshToken,
    profile.expiresIn
  );
  return newUser;
}

// 기존 사용자에게 Discord 계정을 연동.
export async function linkDiscordToUser(
  userId: string,
  profile: UserProfile
): Promise<IUser> {
  // 1. Discord 계정이 이미 다른 사용자와 연결되어 있는지 확인
  const existingUserByProvider = await userRepository.findUserByProvider('discord', profile.id);
  if (existingUserByProvider) {
    throw new Error('이미 다른 계정에 연동된 디스코드 계정입니다.');
  }

  // 2. 현재 로그인한 사용자 정보 가져오기
  const currentUser = await userRepository.findUserById(userId);
  if (!currentUser) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  // 3. 연동할 프로바이더 정보 생성
  const providerData: IOAuthProvider = {
    provider: 'discord',
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
  };

  // 4. 사용자 계정에 프로바이더 연동
  const linkedUser = await userRepository.linkProviderToUser(currentUser, providerData);

  // 5. 소셜 토큰 저장
    await tokenRepository.storeProviderTokens(
      linkedUser.id,
      'discord',
      profile.accessToken,
      profile.refreshToken,
      profile.expiresIn
    );
  
    return linkedUser;
  }
  
  // 사용자의 Discord 연동을 해제합니다.
  export async function unlinkDiscord(userId: string): Promise<IUser | null> {
    // 1. Redis에서 소셜 토큰 삭제
    await tokenRepository.deleteProviderTokens(userId, 'discord');
  
    // 2. MongoDB에서 provider 정보 삭제
    const updatedUser = await userRepository.unlinkProvider(userId, 'discord');
  
    return updatedUser;
  }

  
// 사용자의 카카오 알림 수신 동의 상태를 변경합니다.
export async function updateKakaoNotificationSetting(userId: string, enabled: boolean): Promise<IUser | null> {
  return await userRepository.updateProviderTalkStatus(userId, 'kakao', enabled);
}