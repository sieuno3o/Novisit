import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor, KeywordDomainPair } from '../types/crawl.js';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository.js';
import { findDomainById } from '../repository/mongodb/domainRepository.js';
import { getSettingsByIds, saveMessage } from '../repository/mongodb/settingsRepository.js';
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

// URL에서 도메인 이름 추출 (예: www.pknu.ac.kr -> pknu)
function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    if (parts.length >= 2 && parts[0] === 'www' && parts[1]) {
      return parts[1];
    } else if (parts.length >= 1 && parts[0]) {
      return parts[0];
    }
    
    return hostname || 'unknown';
  } catch (error) {
    const match = url.match(/\/\/(?:www\.)?([^./]+)/);
    return match && match[1] ? match[1] : 'unknown';
  }
}

// URL에서 소스 이름 추출 (PKNU, NAVER 등)
function getSourceFromUrl(url: string): string {
  const domainName = extractDomainName(url);
  return domainName.toUpperCase();
}

/**
 * 1. 하나의 URL에 대해 공지사항 목록 크롤링 후 키워드 매칭, 상세 페이지 크롤링 및 알림 전송
 * @param url 크롤링할 URL
 * @param keywordDomainPairs 키워드와 도메인ID 쌍 배열
 * @param crawler WebCrawler 인스턴스
 * @returns 처리된 공지사항 수
 */
async function crawlAndFilterByKeywords(
  url: string,
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler
): Promise<number> {
  let totalProcessed = 0;
  
  try {
    // URL에서 소스 이름 추출 (PKNU, NAVER 등)
    const source = getSourceFromUrl(url);
    
    // 크롤링은 한 번만 수행 (같은 URL이므로)
    const lastKnownNumber = await getLatestNoticeNumber(source);
    
    // 공지사항 목록 크롤링 (URL에 따라 분기 - webCrawler에서 처리)
    const crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber);
    
    if (!crawlResult.notices || crawlResult.notices.length === 0) {
      console.log(`[크롤링] ${url}: 새 공지 없음`);
      return totalProcessed;
    }
    
    // DB에 저장 (모든 공지사항 저장)
    await saveNotices(crawlResult.notices, source);
    
    // 각 공지사항에 대해 처리
    for (const notice of crawlResult.notices) {
      // 공지사항 제목을 키워드와 비교
      const matchedPairs = keywordDomainPairs.filter(pair =>
        matchesKeywords(notice.title, [pair.keyword])
      );
      
      if (matchedPairs.length === 0) {
        continue; // 키워드 매칭 없음
      }
      
      console.log(`[크롤링] 공지사항 #${notice.number} "${notice.title}": ${matchedPairs.length}개 키워드 매칭`);
      
      // 상세 페이지 크롤링 (URL에 따라 분기)
      let detailContent = '';
      try {
        detailContent = await crawler.crawlNoticeDetail(url, notice.link);
        console.log(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 완료 (${detailContent.length}자)`);
      } catch (error: any) {
        console.error(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 실패:`, error.message);
        continue; // 상세 페이지 크롤링 실패 시 스킵
      }
      
      // 각 매칭된 키워드-도메인ID 쌍에 대해 처리
      for (const pair of matchedPairs) {
        const { keyword, domain_id } = pair;
        
        try {
          // Domain 조회하여 setting_ids 가져오기
          const domain = await findDomainById(domain_id);
          if (!domain) {
            console.log(`[알림] domain_id ${domain_id}: Domain을 찾을 수 없음`);
            continue;
          }
          
          if (!domain.setting_ids || domain.setting_ids.length === 0) {
            console.log(`[알림] domain_id ${domain_id}: setting_ids 없음`);
            continue;
          }
          
          // setting_ids로 Settings 조회
          const settings = await getSettingsByIds(domain.setting_ids);
          
          if (settings.length === 0) {
            console.log(`[알림] domain_id ${domain_id}: Settings 없음`);
            continue;
          }
          
          console.log(`[알림] domain_id ${domain_id}: ${settings.length}개 Setting 발견`);
          
          // 각 Setting의 user_id로 알림 전송 및 Message 저장
          for (const setting of settings) {
            try {
              // 메시지 내용 구성 (제목 + 상세 내용)
              const messageContent = `새 공지사항\n제목: ${notice.title}\n번호: ${notice.number}\n\n${detailContent.substring(0, 500)}${detailContent.length > 500 ? '...' : ''}\n\n링크: ${notice.link}`;
              
              // 카카오 메시지 전송
              await sendKakaoMessage(setting.user_id, {
                object_type: 'text',
                text: messageContent,
                link: {
                  web_url: notice.link,
                  mobile_web_url: notice.link
                },
                button_title: '자세히 보기'
              });
              
              // Message 저장
              const settingId = setting._id ? String(setting._id) : setting.id;
              await saveMessage(settingId, messageContent, 'kakao');
              
              totalProcessed++;
              console.log(`[알림] Setting "${setting.name}" (user_id: ${setting.user_id}): 공지사항 #${notice.number} 알림 전송 완료`);
              
              // 메시지 전송 간 딜레이 (API 제한 방지)
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error: any) {
              console.error(`[알림] Setting "${setting.name}" 알림 전송 실패:`, error.message);
              // 개별 메시지 실패는 전체 작업을 중단하지 않음
            }
          }
        } catch (error: any) {
          console.error(`[알림] domain_id ${domain_id} 처리 실패:`, error.message);
          // 개별 도메인 실패는 전체 작업을 중단하지 않음
        }
      }
    }
    
  } catch (error: any) {
    console.error(`[크롤링] ${url} 크롤링 실패:`, error.message);
    throw error;
  }
  
  return totalProcessed;
}


// 작업 프로세서
const processJob: JobProcessor = async (job) => {
  const crawler = new WebCrawler();
  
  try {
    // 작업 데이터에서 크롤링 설정 가져오기
    const { url, jobType, keywordDomainPairs } = job.data;
    
    let result: any;
    
    // 동적 jobType 체크: 'crawl-{domainName}-notices' 형식
    if (jobType && jobType.startsWith('crawl-') && jobType.endsWith('-notices')) {
      console.log(`[Job] ${job.name} 시작: URL 기반 크롤링 및 알림 전송`);
      
      if (!url) {
        throw new Error('URL이 제공되지 않았습니다.');
      }
      
      if (!keywordDomainPairs || keywordDomainPairs.length === 0) {
        console.log(`[Job] ${job.name}: keywordDomainPairs가 없어 스킵`);
        result = {
          success: true,
          executedAt: new Date(),
          message: 'keywordDomainPairs가 없어 작업을 건너뛰었습니다.'
        };
      } else {
        // 크롤링, 키워드 매칭, 상세 페이지 크롤링 및 알림 전송
        console.log(`[Job] ${url}: ${keywordDomainPairs.length}개 키워드-도메인ID 쌍으로 크롤링 시작`);
        const totalProcessed = await crawlAndFilterByKeywords(url, keywordDomainPairs, crawler);
        
        result = {
          success: true,
          executedAt: new Date(),
          totalProcessed,
          message: `처리 완료: ${totalProcessed}개 알림 전송`
        };
        
        console.log(`[Job] ${job.name} 완료: ${totalProcessed}개 알림 전송`);
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

