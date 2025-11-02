import { User, IUser, IOAuthProvider } from '../../models/User.js';

//특정 provider와 providerId로 사용자를 찾습니다.
 
export const findUserByProvider = (providerName: string, providerId: string): Promise<IUser | null> => {
  return User.findOne({
    'providers.provider': providerName,
    'providers.providerId': providerId,
  }).exec();
};


// ID로 사용자를 찾습니다.
export const findUserById = (id: string): Promise<IUser | null> => {
  return User.findById(id).exec();
};

// ID로 사용자를 찾습니다 (문자열 _id 지원용)
// 크롤링/필터링 로직에서 사용자가 문자열 _id를 사용하는 경우를 위해 별도 함수 생성
export const findUserByIdString = (id: string): Promise<IUser | null> => {
  // _id가 문자열로 저장된 경우를 고려하여 findOne 사용
  return User.findOne({ _id: id }).exec();
};

//새로운 사용자를 생성합니다.

export const createUser = (email: string, name: string | undefined, providerData: IOAuthProvider): Promise<IUser> => {
  return User.create({
    email,
    name,
    providers: [providerData],
  });
};

//기존 사용자에게 새로운 provider 정보를 추가하여 계정을 연결합니다.

export const linkProviderToUser = (user: IUser, providerData: IOAuthProvider): Promise<IUser> => {
  user.providers.push(providerData);
  return user.save();
};


// 사용자의 특정 provider 연결을 해제합니다.
export const unlinkProvider = async (userId: string, providerName: string): Promise<IUser | null> => {
  return User.findByIdAndUpdate(
    userId,
    { $pull: { providers: { provider: providerName } } },
    { new: true }
  ).exec();
};

// 사용자의 특정 provider의 talk_message_enabled 상태를 업데이트합니다.
export const updateProviderTalkStatus = async (userId: string, providerName: string, talkEnabled: boolean): Promise<IUser | null> => {
  const user = await User.findById(userId);
  if (user) {
    const provider = user.providers.find(p => p.provider === providerName);
    if (provider) {
      provider.talk_message_enabled = talkEnabled;
      user.markModified('providers'); // Mark the array as modified
      return user.save();
    }
  }
  return null;
};

// 사용자의 이름을 업데이트합니다.
export const updateUserName = async (userId: string, name: string): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { name }, { new: true }).exec();
};

// 사용자를 삭제합니다.
export const deleteUser = async (userId: string): Promise<IUser | null> => {
  return User.findByIdAndDelete(userId).exec();
};
