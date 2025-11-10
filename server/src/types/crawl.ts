import { Job } from 'bullmq';

// 공지사항 데이터
export interface Notice {
  number: string;
  title: string;
  link: string;
  postedAt: string;    // 공지사항 작성일자 (실제 게시된 날짜)
  crawledAt: Date;      // 크롤링한 시간
}

// 공지사항 크롤링 결과
export interface NoticeResult {
  url: string;
  title: string;
  timestamp: string;
  totalNotices: number;
  notices: Notice[];
  summary: {
    extractedAt: string;
    source: string;
    totalCount: number;
  };
  // 키워드 필터링 정보
  keyword?: string;
  domain_id?: string;
}

// BullMQ 작업 데이터
export interface JobData {
  jobType?: string; // 동적 jobType: 'crawl-{domainName}-notices' 형식
  url?: string;
  scheduledTime?: number | Date;
  timezone?: string;
  message?: string;
  keywordDomainPairs?: KeywordDomainPair[];
}

export interface QueueStatus {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface JobResult {
  success: boolean;
  executedAt: Date;
  jobType: string;
  result: any;
}

export type JobProcessor = (job: Job<JobData>) => Promise<JobResult>;

// 키워드와 도메인 ID 쌍
export interface KeywordDomainPair {
  keyword: string;
  domain_id: string;
}

// 크롤링 작업객체
export interface CrawlJob {
  url: string;
  keywordDomainPairs: KeywordDomainPair[];
}

