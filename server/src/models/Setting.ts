import mongoose, { Schema, Document } from "mongoose";

// Setting 인터페이스
export interface ISetting extends Document {
  user_id: string;
  domain_id: string;
  name: string;
  channel: string[];
  summary: boolean;
  created_at: Date;
  messages: string[];
}

// Setting 스키마
const SettingSchema = new Schema<ISetting>({
  user_id: { type: String, required: true },
  domain_id: { type: String, required: true },
  name: { type: String, required: true },
  channel: { type: [String], required: true },
  summary: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
});

// settings 모델
export default mongoose.model<ISetting>("Setting", SettingSchema, "settings");
