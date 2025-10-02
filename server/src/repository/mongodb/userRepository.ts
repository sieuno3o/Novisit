import { User, IUser, IOAuthProvider } from '../../models/User';

//특정 provider와 providerId로 사용자를 찾습니다.
 
export const findUserByProvider = (providerName: string, providerId: string): Promise<IUser | null> => {
  return User.findOne({
    'providers.provider': providerName,
    'providers.providerId': providerId,
  }).exec();
};

// 이메일로 사용자를 찾습니다.
export const findUserByEmail = (email: string): Promise<IUser | null> => {
  return User.findOne({ email }).exec();
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
