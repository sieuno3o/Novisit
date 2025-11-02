import mongoose, { Schema, Document } from "mongoose";

// Message 인터페이스
export interface IMessage extends Document {
  setting_id: mongoose.Types.ObjectId;
  contents: string;
  sended_at: Date;
  platform: string;
}

// Message 스키마
const MessageSchema = new Schema<IMessage>({
  setting_id: { type: Schema.Types.ObjectId, ref: "Setting", required: true },
  contents: { type: String, required: true },
  sended_at: { type: Date, default: Date.now },
  platform: { type: String, required: true },
});

// messages 모델
export default mongoose.model<IMessage>("Message", MessageSchema, "messages");