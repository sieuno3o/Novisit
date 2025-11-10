import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor, NoticeResult, KeywordDomainPair, Notice } from '../types/crawl.js';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository.js';
import { findDomainById } from '../repository/mongodb/domainRepository.js';
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
 * 1. 하나의 URL에 대해 여러 키워드-도메인ID 쌍으로 크롤링 및 필터링하여 NoticeResult 리스트 생성
 * @param url 크롤링할 URL
 * @param keywordDomainPairs 키워드와 도메인ID 쌍 배열
 * @param crawler WebCrawler 인스턴스
 * @returns NoticeResult 배열 (각 키워드-도메인ID 쌍마다 하나씩)
 */
async function crawlAndFilterByKeywords(
  url: string,
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler
): Promise<NoticeResult[]> {
  const noticeResults: NoticeResult[] = [];
  
  try {
    // URL에서 소스 이름 추출 (PKNU, NAVER 등)
    const source = getSourceFromUrl(url);
    
    // 크롤링은 한 번만 수행 (같은 URL이므로)
    const lastKnownNumber = await getLatestNoticeNumber(source);
    
    // 현재는 PKNU만 지원
    if (!url.includes('pknu')) {
      console.log(`[크롤링] ${url}: PKNU가 아닌 URL로 현재 미지원`);
      return noticeResults;
    }
    
    const crawlResult = await crawler.crawlPKNUNotices(lastKnownNumber);
    
    if (!crawlResult.notices || crawlResult.notices.length === 0) {
      console.log(`[크롤링] ${url}: 새 공지 없음`);
      return noticeResults;
    }
    
    // DB에 저장 (모든 공지사항 저장)
    await saveNotices(crawlResult.notices, source);
    
    // 각 keywordDomainPair에 대해 필터링하여 NoticeResult 생성
    for (const pair of keywordDomainPairs) {
      const { keyword, domain_id } = pair;
      
      // 키워드로 필터링
      const filteredNotices = crawlResult.notices.filter((notice: Notice) =>
        matchesKeywords(notice.title, [keyword])
      );
      
      if (filteredNotices.length === 0) {
        console.log(`[크롤링] ${url} - 키워드 "${keyword}" (domain_id: ${domain_id}): 매칭 없음`);
        continue;
      }
      
      // NoticeResult 생성
      const noticeResult: NoticeResult = {
        url: crawlResult.url,
        title: crawlResult.title,
        timestamp: crawlResult.timestamp,
        totalNotices: filteredNotices.length,
        notices: filteredNotices,
        summary: {
          extractedAt: crawlResult.summary.extractedAt,
          source: crawlResult.summary.source,
          totalCount: filteredNotices.length
        },
        keyword: keyword,
        domain_id: domain_id
      };
      
      noticeResults.push(noticeResult);
      console.log(`[크롤링] ${url} - 키워드 "${keyword}" (domain_id: ${domain_id}): ${filteredNotices.length}개 공지 매칭`);
    }
    
  } catch (error: any) {
    console.error(`[크롤링] ${url} 크롤링 실패:`, error.message);
    throw error;
  }
  
  return noticeResults;
}

/**
 * 2. NoticeResult 리스트를 순서대로 알림 전송
 * @param noticeResults NoticeResult 배열 (각각 domain_id와 keyword 정보 포함)
 * @returns 전송된 메시지 수
 */
async function sendNotificationsForResults(noticeResults: NoticeResult[]): Promise<number> {
  let totalMessagesSent = 0;
  
  for (const noticeResult of noticeResults) {
    try {
      if (!noticeResult.domain_id) {
        console.log(`[알림] NoticeResult에 domain_id가 없어 스킵`);
        continue;
      }
      
      // domain_id로 Settings 조회
      const settings = await getSettingsByDomainId(noticeResult.domain_id);
      
      if (settings.length === 0) {
        console.log(`[알림] domain_id ${noticeResult.domain_id}: 설정 없음`);
        continue;
      }
      
      console.log(`[알림] domain_id ${noticeResult.domain_id}: ${settings.length}개 Setting 발견`);
      
      // 각 Setting별로 처리
      for (const setting of settings) {
        // Setting에 대한 모든 공지사항에 대해 메시지 전송
        console.log(`[알림] Setting "${setting.name}": ${noticeResult.notices.length}개 공지 매칭`);
        
        // 각 공지사항에 대해 메시지 전송
        for (const notice of noticeResult.notices) {
          try {
            // 메시지 내용 구성
            const messageContent = `새 공지사항\n제목: ${notice.title}\n번호: ${notice.number}\n링크: ${notice.link}`;
            
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
            
            totalMessagesSent++;
            console.log(`[알림] Setting "${setting.name}": 공지사항 #${notice.number} 메시지 전송 완료`);
            
            // 메시지 전송 간 딜레이 (API 제한 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error: any) {
            console.error(`[알림] Setting "${setting.name}" 메시지 전송 실패:`, error.message);
            // 개별 메시지 실패는 전체 작업을 중단하지 않음
          }
        }
      }
      
    } catch (error: any) {
      console.error(`[알림] NoticeResult 처리 실패:`, error.message);
      // 개별 실패는 전체 작업을 중단하지 않음
    }
  }
  
  return totalMessagesSent;
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
        // 1. 크롤링 및 키워드 필터링으로 NoticeResult 리스트 생성
        console.log(`[Job] ${url}: ${keywordDomainPairs.length}개 키워드-도메인ID 쌍으로 크롤링 시작`);
        const noticeResults = await crawlAndFilterByKeywords(url, keywordDomainPairs, crawler);
        
        const totalNoticesCrawled = noticeResults.reduce((sum, result) => sum + result.totalNotices, 0);
        console.log(`[Job] ${url}: 총 ${noticeResults.length}개 NoticeResult 생성, ${totalNoticesCrawled}개 공지사항`);
        
        // 2. NoticeResult 리스트를 순서대로 알림 전송
        const totalMessagesSent = await sendNotificationsForResults(noticeResults);
        
        result = {
          success: true,
          executedAt: new Date(),
          totalNoticesCrawled,
          totalMessagesSent,
          noticeResultsCount: noticeResults.length,
          message: `크롤링: ${totalNoticesCrawled}개, 메시지 전송: ${totalMessagesSent}개`
        };
        
        console.log(`[Job] ${job.name} 완료: ${totalNoticesCrawled}개 공지 크롤링, ${totalMessagesSent}개 메시지 전송`);
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

