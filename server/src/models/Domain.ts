import mongoose, { Schema, Document,} from 'mongoose';

// Domain 인터페이스
export interface IDomain extends Document {
  _id: string | mongoose.Types.ObjectId;
  name: string;
  url_list: string[];
  keywords: string[];
  setting_ids: string[];
}

// Domain 스키마
const DomainSchema = new Schema<IDomain>({
  _id: Schema.Types.Mixed, // ObjectId, String, Number 모두 허용
  name: { type: String, required: true },
  url_list: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  setting_ids: { type: [String], default: [] },
}, {
  _id: true // _id 사용 명시
});

// domains 모델
export default mongoose.model<IDomain>("Domain", DomainSchema, "domains");