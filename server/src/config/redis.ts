import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor } from '../types/crawl.js';
import { saveNotices } from '../repository/mongodb/noticeRepository.js';

// Redis 연결 설정
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: 3,
});

// 큐 생성
export const scheduledJobsQueue = new Queue<JobData>('scheduled-jobs', { connection });

// 작업 프로세서
const processJob: JobProcessor = async (job) => {
  const crawler = new WebCrawler();
  
  try {
    // 작업 데이터에서 크롤링 설정 가져오기
    const { url, jobType } = job.data;
    
    let result: any;
    
    if (jobType === 'crawl-pknu-notices') {
      // 부경대학교 공지사항 크롤링
      result = await crawler.crawlPKNUNotices(url);
      
      // MongoDB에 저장
      if (result.notices && result.notices.length > 0) {
        await saveNotices(result.notices, result.url);
        console.log(`[Job] ${job.name} 완료: ${result.notices.length}개 저장`);
      }
    } else {
      // 기본 작업
      result = { 
        success: true, 
        executedAt: new Date(),
        message: job.data.message || '기본 작업 완료'
      };
    }
    
    // 크롤러 정리
    await crawler.close();
    
    return {
      success: true,
      executedAt: new Date(),
      jobType: jobType || 'default',
      result: result
    };
    
  } catch (error) {
    console.error(`작업 실행 오류 (${job.name}):`, error);
    
    // 크롤러 정리
    await crawler.close();
    
    throw error; // 에러를 다시 던져서 BullMQ가 실패로 처리하도록 함
  }
};

// 작업 프로세서 생성
export const worker = new Worker<JobData>('scheduled-jobs', processJob, { connection });

// 에러 핸들링
worker.on('error', (err: Error) => {
  console.error('Worker error:', err);
});

worker.on('completed', (job) => {
  console.log(`[Worker] ✓ ${job.name}`);
});

worker.on('failed', (job, err: Error) => {
  console.error(`[Worker] ✗ ${job?.name}:`, err.message);
});

export {
  connection
};

