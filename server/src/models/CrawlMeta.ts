import mongoose, { Schema, Document } from 'mongoose';

// 크롤링 메타데이터 인터페이스
export interface ICrawlMeta extends Document {
  crawlDate: string;     // 크롤링 날짜 (yymmdd-hh 형식)
  url: string;           // 크롤링한 URL
  latestNumber: string | null;  // 해당 크롤링에서 발견한 최신 공지번호 (처음 조사이고 공지 없으면 null)
  noticesCount: number;  // 저장된 공지사항 개수
  source: string;        // 소스 (기본값: 'PKNU')
  crawledAt: Date;       // 크롤링한 시간
}

// CrawlMeta 스키마
const CrawlMetaSchema = new Schema<ICrawlMeta>({
  crawlDate: { type: String, required: true },
  url: { type: String, required: true },
  latestNumber: { type: String, required: false },  // 처음 조사일 때 null 허용
  noticesCount: { type: Number, required: true, default: 0 },
  source: { type: String, required: true, default: 'PKNU' },
  crawledAt: { type: Date, required: true, default: Date.now },
});

// 인덱스 생성 (크롤링 날짜, URL로 조회 최적화)
CrawlMetaSchema.index({ crawlDate: -1, url: 1, source: 1 });
CrawlMetaSchema.index({ url: 1, source: 1, crawlDate: -1 }); // 이전 시간대 조회용

// CrawlMeta 모델
export default mongoose.model<ICrawlMeta>('CrawlMeta', CrawlMetaSchema, 'crawl_metas');

