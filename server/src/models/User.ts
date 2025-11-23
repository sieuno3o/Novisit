import mongoose, { Schema, Document,} from 'mongoose';

// OAuth 제공자 정보에 대한 인터페이스
export interface IOAuthProvider {
  provider: 'kakao' | 'discord';
  providerId: string;
  email: string | undefined;
  name: string | undefined;
  talk_message_enabled?: boolean;
}

// User 인터페이스
export interface IUser extends Document {
  email: string;
  name?: string;
  providers: IOAuthProvider[];
  fcmToken?: string | null;
}
// OAuthProvider 스키마
const OAuthProviderSchema = new Schema<IOAuthProvider>({
  provider: { type: String, enum: ['kakao', 'discord'], required: true },
  providerId: { type: String, required: true },
  email: { type: String },
  name: { type: String },
  talk_message_enabled: { type: Boolean, default: true },
}, { _id: false });

// User 스키마
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  providers: [OAuthProviderSchema],
  fcmToken: { type: String, default: null },
}, { timestamps: true });

// User 모델
export const User = mongoose.model<IUser>('User', UserSchema);