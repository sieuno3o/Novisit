import { findUserById, updateUserName as updateUserNameRepo, deleteUser as deleteUserRepo } from '../repository/mongodb/userRepository';
import { IUser } from '../models/User';

// 사용자 정보 조회
export const getUserInfo = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  const isKakaoLinked = user.providers.some(p => p.provider === 'kakao');
  const isDiscordLinked = user.providers.some(p => p.provider === 'discord');

  return {
    name: user.name,
    email: user.email,
    isKakaoLinked,
    isDiscordLinked,
  };
};

// 사용자 이름 변경
export const updateUserName = async (userId: string, newName: string): Promise<IUser | null> => {
  return await updateUserNameRepo(userId, newName);
};

// 회원 탈퇴
export const deleteUser = async (userId: string): Promise<IUser | null> => {
  return await deleteUserRepo(userId);
};
