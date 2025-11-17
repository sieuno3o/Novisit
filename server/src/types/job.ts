import { Job } from 'bullmq';
import { NoticePreview, NoticeResult } from './notice.js';

// Re-export for backward compatibility
export type { NoticePreview, NoticeResult };

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

