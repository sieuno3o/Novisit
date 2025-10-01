import { User, IUser, IOAuthProvider } from '../models/User';
import { redisClient } from '../index';

// 지원하는 provider 이름 타입
type ProviderName = 'kakao' | 'discord';

// provider로부터 받은 사용자 프로필의 형태
interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: Date;
}

// Provider 정보를 받아 DB에서 사용자를 찾거나 생성하고, 토큰을 Redis에 저장.
export async function findOrCreateUser(
  providerName: ProviderName,
  profile: UserProfile
): Promise<IUser> {
  // Provider ID로 기존 사용자가 있는지 확인 
  let user = await User.findOne({
    'providers.provider': providerName,
    'providers.providerId': profile.id,
  });

  // 토큰 저장 로직 redis에 저장  ---> 현재 redis에 저장하면 토큰 탈취 가능성..? db에 저장하는게 나을까
  const storeToken = async (userId: string) => {
    await redisClient.set(
      `token:${userId}:${providerName}:accessToken`,
      profile.accessToken
    );
    if (profile.refreshToken) {
      await redisClient.set(
        `token:${userId}:${providerName}:refreshToken`,
        profile.refreshToken
      );
    }
  };

  // C1: 이미 해당 provider로 로그인한 적 있는 사용자
  if (user) {
    const provider = user.providers.find(p => p.provider === providerName);
    if (provider) {
      const users = await User.find();
      console.log(users);

      await user.save();
    }
    await storeToken(user.id);
    return user;
  }

  // provider 정보를 객체로 정리
  const providerData: IOAuthProvider = {
    provider: providerName,
    providerId: profile.id,
    email: profile.email,
    name: profile.name,
  };

  // C2: 다른 소셜 로그인으로 가입한 이메일이 있는 경우, 계정 연동
  const existingUserByEmail = await User.findOne({ email: profile.email });
  if (existingUserByEmail) {
    existingUserByEmail.providers.push(providerData);
    await existingUserByEmail.save();
    await storeToken(existingUserByEmail.id);
    return existingUserByEmail;
  }

  // C3 : 완전히 새로운 사용자 생성
  const newUser = await User.create({
    email: profile.email,
    name: profile.name,
    providers: [providerData],
  });
  await storeToken(newUser.id);
  return newUser;
}
