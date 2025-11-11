import mongoose, { Schema, Document } from "mongoose";

// Message 인터페이스
export interface IMessage extends Document {
  setting_id: mongoose.Types.ObjectId;
  contents: string;
  sended_at: Date;
  platform: string;
  link: string;  // 공지사항 상세페이지 링크
  title: string;   // 공지사항 제목
}

// Message 스키마
const MessageSchema = new Schema<IMessage>({
  setting_id: { type: Schema.Types.ObjectId, ref: "Setting", required: true },
  contents: { type: String, required: true },
  sended_at: { type: Date, default: Date.now },
  platform: { type: String, required: true },
  link: { type: String, required: true },
  title: { type: String, required: true },
});

// messages 모델
export default mongoose.model<IMessage>("Message", MessageSchema, "messages");