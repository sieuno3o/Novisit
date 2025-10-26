import { Job } from 'bullmq';

// 부경대학교 공지사항 데이터
export interface PKNUNotice {
  number: string;
  title: string;
  link: string;
  postedAt: string;    // 공지사항 작성일자 (실제 게시된 날짜)
  crawledAt: Date;      // 크롤링한 시간
}

// 부경대학교 공지사항 크롤링 결과
export interface PKNUNoticeResult {
  url: string;
  title: string;
  timestamp: string;
  totalNotices: number;
  notices: PKNUNotice[];
  summary: {
    extractedAt: string;
    source: string;
    totalCount: number;
  };
}

// BullMQ 작업 데이터
export interface JobData {
  jobType?: 'crawl-pknu-notices' | 'default';
  url?: string;
  scheduledTime?: number | Date;
  timezone?: string;
  message?: string;
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

