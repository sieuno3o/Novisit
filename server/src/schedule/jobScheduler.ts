import * as cron from 'node-cron';
import { scheduledJobsQueue } from '../config/redis.js';
import { QueueStatus } from '../types/crawl.js';

export class JobScheduler {
  private readonly CRAWL_TIMES = [9, 12, 15, 18]; // 한국시간 기준
  private readonly PKNU_URL = 'https://www.pknu.ac.kr/main/163';

  // 한국시간을 UTC cron 표현식으로 변환
  private getCronExpression(koreanHour: number): string {
    const utcHour = (koreanHour - 9 + 24) % 24;
    return `0 ${utcHour} * * *`;
  }

  // 부경대학교 공지사항 크롤링 스케줄 시작
  start(): void {
    console.log('🔄 부경대학교 공지사항 크롤링 스케줄 시작');
    console.log(`📅 한국시간: ${this.CRAWL_TIMES.join('시, ')}시`);

    this.CRAWL_TIMES.forEach(hour => {
      const cronExpression = this.getCronExpression(hour);
      
      cron.schedule(cronExpression, async () => {
        try {
          await scheduledJobsQueue.add(
            `pknu-crawl-${hour}h`,
            {
              jobType: 'crawl-pknu-notices' as const,
              url: this.PKNU_URL,
              scheduledTime: hour,
              timezone: 'Asia/Seoul',
              message: '부경대학교 공지사항 크롤링'
            },
            {
              removeOnComplete: 10,
              removeOnFail: 5,
            }
          );
        } catch (error) {
          console.error(`[스케줄] 크롤링 작업 추가 실패 (${hour}시):`, error);
        }
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
    });

    console.log('✅ 크롤링 스케줄 등록 완료');
  }

  // 큐 상태 확인
  async getQueueStatus(): Promise<QueueStatus | null> {
    try {
      const waiting = await scheduledJobsQueue.getWaiting();
      const active = await scheduledJobsQueue.getActive();
      const completed = await scheduledJobsQueue.getCompleted();
      const failed = await scheduledJobsQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      console.error('큐 상태 확인 오류:', error);
      return null;
    }
  }
}

