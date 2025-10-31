import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor } from '../types/crawl.js';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository.js';
import { findAllDomains } from '../repository/mongodb/domainRepository.js';
import { getSettingsByDomainId, saveMessage } from '../repository/mongodb/settingsRepository.js';
import { sendKakaoMessage } from '../services/notificationService.js';

// Redis 연결 설정
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: null, // BullMQ 요구사항: null이어야 함
});

// 큐 생성
export const scheduledJobsQueue = new Queue<JobData>('scheduled-jobs', { connection });

// 키워드 필터링 함수
function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true; // 키워드가 없으면 모든 공지 통과
  return keywords.some(keyword => text.includes(keyword));
}

// 작업 프로세서
const processJob: JobProcessor = async (job) => {
  const crawler = new WebCrawler();
  
  try {
    // 작업 데이터에서 크롤링 설정 가져오기
    const { url, jobType } = job.data;
    
    let result: any;
    
    if (jobType === 'crawl-pknu-notices') {
      console.log(`[Job] ${job.name} 시작: Domain 기반 크롤링 및 알림 전송`);
      
      // 1. Domain 조회
      const domains = await findAllDomains();
      console.log(`[Job] ${domains.length}개 Domain 발견`);
      
      let totalNoticesCrawled = 0;
      let totalMessagesSent = 0;
      
      // 각 Domain별로 처리
      for (const domain of domains) {
        if (!domain.url_list || domain.url_list.length === 0) {
          console.log(`[Job] Domain "${domain.name}"에 url_list가 없어 스킵`);
          continue;
        }
        
        console.log(`[Job] Domain "${domain.name}" 처리 시작 (${domain.url_list.length}개 URL)`);
        
        // 각 URL별로 크롤링
        for (const domainUrl of domain.url_list) {
          // 현재는 PKNU만 지원하므로 PKNU URL인지 확인
          if (domainUrl.includes('pknu')) {
            try {
              // 2. 해당 URL에 대한 새 공지사항 크롤링
              const lastKnownNumber = await getLatestNoticeNumber('PKNU');
              const crawlResult = await crawler.crawlPKNUNotices(lastKnownNumber);
              
              if (!crawlResult.notices || crawlResult.notices.length === 0) {
                console.log(`[Job] Domain "${domain.name}" URL "${domainUrl}": 새 공지 없음`);
                continue;
              }
              
              // 3. Domain keywords로 필터링
              const domainFilteredNotices = crawlResult.notices.filter(notice => 
                matchesKeywords(notice.title, domain.keywords || [])
              );
              
              console.log(`[Job] Domain "${domain.name}" URL "${domainUrl}": ${crawlResult.notices.length}개 중 ${domainFilteredNotices.length}개가 Domain keywords 매칭`);
              
              if (domainFilteredNotices.length === 0) {
                // Domain 필터링에서 걸러졌지만 DB에는 저장 (다른 필터로는 매칭될 수 있음)
                await saveNotices(crawlResult.notices, 'PKNU');
                totalNoticesCrawled += crawlResult.notices.length;
                continue;
              }
              
              // DB에 저장
              await saveNotices(domainFilteredNotices, 'PKNU');
              totalNoticesCrawled += domainFilteredNotices.length;
              
              // 4. 해당 Domain의 Settings 조회
              const domainId = domain._id ? String(domain._id) : String(domain.id);
              const settings = await getSettingsByDomainId(domainId);
              console.log(`[Job] Domain "${domain.name}": ${settings.length}개 Setting 발견`);
              
              // 각 Setting별로 처리
              for (const setting of settings) {
                // 5. Setting filter_keywords로 필터링
                const settingFilteredNotices = domainFilteredNotices.filter(notice =>
                  matchesKeywords(notice.title, setting.filter_keywords || [])
                );
                
                if (settingFilteredNotices.length === 0) {
                  console.log(`[Job] Setting "${setting.name}": 필터링 결과 매칭 없음`);
                  continue;
                }
                
                console.log(`[Job] Setting "${setting.name}": ${settingFilteredNotices.length}개 공지 매칭`);
                
                // 6. 각 공지사항에 대해 메시지 전송
                for (const notice of settingFilteredNotices) {
                  try {
                    // 메시지 내용 구성
                    const messageContent = `새 공지사항\n제목: ${notice.title}\n번호: ${notice.number}\n링크: ${notice.link}`;
                    
                    // 7. 카카오 메시지 전송
                    await sendKakaoMessage(setting.user_id, {
                      object_type: 'text',
                      text: messageContent,
                      link: {
                        web_url: notice.link,
                        mobile_web_url: notice.link
                      },
                      button_title: '자세히 보기'
                    });
                    
                    // 8. Message 저장
                    const settingId = setting._id ? String(setting._id) : setting.id;
                    await saveMessage(settingId, messageContent, 'kakao');
                    
                    totalMessagesSent++;
                    console.log(`[Job] Setting "${setting.name}": 공지사항 #${notice.number} 메시지 전송 완료`);
                    
                    // 메시지 전송 간 딜레이 (API 제한 방지)
                    await new Promise(resolve => setTimeout(resolve, 500));
                  } catch (error: any) {
                    console.error(`[Job] Setting "${setting.name}" 메시지 전송 실패:`, error.message);
                    // 개별 메시지 실패는 전체 작업을 중단하지 않음
                  }
                }
              }
            } catch (error: any) {
              console.error(`[Job] Domain "${domain.name}" URL "${domainUrl}" 크롤링 실패:`, error.message);
              // 개별 URL 실패는 전체 작업을 중단하지 않음
              continue;
            }
          } else {
            console.log(`[Job] Domain "${domain.name}" URL "${domainUrl}": PKNU가 아닌 URL로 현재 미지원`);
          }
        }
      }
      
      result = {
        success: true,
        executedAt: new Date(),
        totalNoticesCrawled,
        totalMessagesSent,
        message: `크롤링: ${totalNoticesCrawled}개, 메시지 전송: ${totalMessagesSent}개`
      };
      
      console.log(`[Job] ${job.name} 완료: ${totalNoticesCrawled}개 공지 크롤링, ${totalMessagesSent}개 메시지 전송`);
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

