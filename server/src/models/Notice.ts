import mongoose, { Schema, Document } from 'mongoose';

// Notice 인터페이스
export interface INotice extends Document {
  number: string;
  title: string;
  link: string;
  source: string;
  postedAt: string;     // 공지사항 실제 작성일자
  crawledAt: Date;      // 크롤링한 시간
}

// Notice 스키마
const NoticeSchema = new Schema<INotice>({
  number: { type: String, required: true },
  title: { type: String, required: true },
  link: { type: String, required: true },
  source: { type: String, required: true, default: 'PKNU' },
  postedAt: { type: String, required: true },
  crawledAt: { type: Date, required: true },
});

// 복합 인덱스 생성 (중복 방지)
NoticeSchema.index({ number: 1, source: 1 }, { unique: true });

// Notice 모델
export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);

