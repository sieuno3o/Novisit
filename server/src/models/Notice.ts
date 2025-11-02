import mongoose, { Schema, Document } from 'mongoose';

// Notice 인터페이스
export interface INotice extends Document {
  number: string;
  title: string;
  link: string;
  url: string;          // 크롤링한 URL (도메인 url_list의 URL)
  crawlDate: string;   // 크롤링 날짜 (yymmdd-hh 형식)
  source: string;
  postedAt: string;     // 공지사항 실제 작성일자
  crawledAt: Date;      // 크롤링한 시간
}

// Notice 스키마
const NoticeSchema = new Schema<INotice>({
  number: { type: String, required: true },
  title: { type: String, required: true },
  link: { type: String, required: true },
  url: { type: String, required: true },
  crawlDate: { type: String, required: true },  // yymmdd-hh 형식
  source: { type: String, required: true, default: 'PKNU' },
  postedAt: { type: String, required: true },
  crawledAt: { type: Date, required: true },
});

// 복합 인덱스 생성 (중복 방지) - url 추가
NoticeSchema.index({ number: 1, source: 1, url: 1 }, { unique: true });

// Notice 모델
export const Notice = mongoose.model<INotice>('Notice', NoticeSchema);

