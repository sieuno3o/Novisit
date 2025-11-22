import { findUserById, updateUserName as updateUserNameRepo, deleteUser as deleteUserRepo } from '../repository/mongodb/userRepository.js';
import { IUser, User } from '../models/User.js';
import { unlinkKakaoUser, logoutKakaoUser } from './kakaoAPIClient.js';
import { getProviderTokens, deleteProviderTokens } from '../repository/redis/tokenRepository.js';

// 사용자 정보 조회
export const getUserInfo = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const isKakaoLinked = user.providers.some(p => p.provider === 'kakao');
  const isDiscordLinked = user.providers.some(p => p.provider === 'discord');
  const isPushEnabled = !!user.fcmToken;

  return {
    name: user.name,
    email: user.email,
    isKakaoLinked,
    isDiscordLinked,
    isPushEnabled,
  };
};

// 사용자 이름 변경
export const updateUserName = async (userId: string, newName: string): Promise<IUser | null> => {
  return await updateUserNameRepo(userId, newName);
};

// FCM 토큰 업데이트
export const updateFCMToken = async (userId: string, fcmToken: string | null): Promise<IUser | null> => {
  return await User.findByIdAndUpdate(userId, { fcmToken }, { new: true }).exec();
};

// 회원 탈퇴
export const deleteUser = async (userId: string): Promise<IUser | null> => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const kakaoProvider = user.providers.find(p => p.provider === 'kakao');
  if (kakaoProvider) {
    // Redis에서 카카오 토큰 가져오기
    const { accessToken } = await getProviderTokens(userId, 'kakao');

    // API 호출
    const apiCalls = [];
    if (accessToken) {
      apiCalls.push(logoutKakaoUser(accessToken));
    }
    apiCalls.push(unlinkKakaoUser(kakaoProvider.providerId));
    
    await Promise.all(apiCalls).catch(err => {
      // 한쪽 API 호출이 실패하더라도 다른 쪽은 실행되도록 하고, 에러는 로깅만 함
      console.error('카카오 API 호출 중 오류 발생 (무시하고 계속 진행):', err.message);
    });

    // Redis에서 카카오 토큰 삭제
    await deleteProviderTokens(userId, 'kakao');
  }

  // 다른 프로바이더 토큰도 삭제
  const discordProvider = user.providers.find(p => p.provider === 'discord');
  if (discordProvider) {
    await deleteProviderTokens(userId, 'discord');
  }

  // DB에서 사용자 삭제
  return await deleteUserRepo(userId);
};