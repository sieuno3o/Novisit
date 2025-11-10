import * as cron from 'node-cron';
import { scheduledJobsQueue } from '../config/redis.js';
import { QueueStatus, CrawlJob, KeywordDomainPair } from '../types/crawl.js';
import { findAllDomains } from '../repository/mongodb/domainRepository.js';
import { IDomain } from '../models/Domain.js';

export class JobScheduler {
  private readonly CRAWL_TIMES = [9, 12, 15, 18]; // 한국시간 기준

  // 한국시간을 UTC cron 표현식으로 변환
  private getCronExpression(koreanHour: number): string {
    const utcHour = (koreanHour - 9 + 24) % 24;
    return `0 ${utcHour} * * *`;
  }

  // URL에서 도메인 이름 추출 (예: www.pknu.ac.kr -> pknu, www.naver.com -> naver)
  private extractDomainName(url: string): string {
    try {
      // URL에서 호스트명 추출
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // 호스트명을 .으로 분리
      const parts = hostname.split('.');
      
      // www.로 시작하면 두 번째 부분, 아니면 첫 번째 부분
      if (parts.length >= 2 && parts[0] === 'www' && parts[1]) {
        return parts[1];
      } else if (parts.length >= 1 && parts[0]) {
        return parts[0];
      }
      
      // 기본값: 호스트명 전체
      return hostname || 'unknown';
    } catch (error) {
      // URL 파싱 실패 시 호스트명에서 직접 추출 시도
      const match = url.match(/\/\/(?:www\.)?([^./]+)/);
      return match && match[1] ? match[1] : 'unknown';
    }
  }

  // 크롤링 스케줄 시작 -> 서버 시작하면 바로 실행됨
  start(): void {
    console.log('🔄 공지사항 크롤링 스케줄 시작');
    console.log(`📅 한국시간: ${this.CRAWL_TIMES.join('시, ')}시`);

    this.CRAWL_TIMES.forEach(hour => {
      const cronExpression = this.getCronExpression(hour);
      
      cron.schedule(cronExpression, async () => {
        try {
          // 크롤링 작업객체 생성
          const crawlJobs = await this.createCrawlJobs();
          
          // 현재 날짜를 yymmdd 형식으로 가져오기
          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const dateStr = `${yy}${mm}${dd}`;
          
          // 각 크롤링 작업객체에 대해 큐에 작업 예약
          for (const crawlJob of crawlJobs) {
            const domainName = this.extractDomainName(crawlJob.url);
            const jobName = `${domainName}-crawl-${dateStr}-${hour}h`;
            
            await scheduledJobsQueue.add(
              jobName,
              {
                jobType: 'crawl-pknu-notices' as const, // TODO: 동적 jobType으로 변경 필요 시 수정
                url: crawlJob.url,
                scheduledTime: hour,
                timezone: 'Asia/Seoul',
                message: `${domainName} 공지사항 크롤링`,
                keywordDomainPairs: crawlJob.keywordDomainPairs // 크롤링 작업객체 정보 포함
              },
              {
                removeOnComplete: 10,
                removeOnFail: 5,
              }
            );
            
            console.log(`[스케줄] 큐에 작업 추가: ${jobName} (${crawlJob.url})`);
          }
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

  // 여러 Domain의 url_list를 모아서 중복 제거 후 크롤링 작업객체 생성
  async createCrawlJobs(): Promise<CrawlJob[]> {
    try {
      // 모든 Domain 조회
      const domains = await findAllDomains();
      
      // URL을 키로 하고, keyword와 domain_id 쌍 배열을 값으로 하는 Map
      const urlMap = new Map<string, KeywordDomainPair[]>();
      
      // 각 Domain의 url_list를 순회하면서 Map에 추가
      for (const domain of domains) {
        const domainId = domain.id;
        
        // 각 Domain의 url_list를 순회
        for (const url of domain.url_list) {
          // 해당 url에 대한 keywordDomainPairs 배열이 없으면 생성
          if (!urlMap.has(url)) {
            urlMap.set(url, []);
          }
          
          // 각 keyword에 대해 keywordDomainPair 추가
          for (const keyword of domain.keywords) {
            const pairs = urlMap.get(url)!;
            // 중복 체크: 같은 keyword와 domain_id 쌍이 이미 있는지 확인
            const exists = pairs.some(
              pair => pair.keyword === keyword && pair.domain_id === domainId
            );
            
            if (!exists) {
              pairs.push({
                keyword,
                domain_id: domainId
              });
            }
          }
        }
      }
      
      // Map을 CrawlJob 배열로 변환
      const crawlJobs: CrawlJob[] = Array.from(urlMap.entries()).map(([url, keywordDomainPairs]) => ({
        url,
        keywordDomainPairs
      }));
      
      return crawlJobs;
    } catch (error) {
      console.error('❌ 크롤링 작업객체 생성 실패:', error);
      throw error;
    }
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

