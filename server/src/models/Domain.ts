import mongoose, { Schema, Document,} from 'mongoose';

// Domain 인터페이스
export interface IDomain extends Document {
  name: string;
  url_list: string[];
  keywords: string[];
  setting_ids: string[];
}

// Domain 스키마
const DomainSchema = new Schema<IDomain>({
  name: { type: String, required: true },
  url_list: { type: [String], default: [] },
  keywords: { type: [String], default: [] },
  setting_ids: { type: [String], default: [] },
});

// domains 모델
export default mongoose.model<IDomain>("Domain", DomainSchema, "domains");