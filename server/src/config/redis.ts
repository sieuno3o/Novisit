import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor, KeywordDomainPair, NoticePreview, NoticeResult } from '../types/crawl.js';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository.js';
import { findDomainById } from '../repository/mongodb/domainRepository.js';
import { getSettingsByIds, saveMessage } from '../repository/mongodb/settingsRepository.js';
import { sendKakaoMessage } from '../services/notificationService.js';
import { getSourceFromUrl } from '../utils/urlUtils.js';

// Redis 연결 설정
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || '',
  maxRetriesPerRequest: null, // BullMQ 요구사항: null이어야 함
});

// 큐 생성
export const scheduledJobsQueue = new Queue<JobData>('scheduled-jobs', { connection });

// 키워드 필터링 함수 (export하여 다른 모듈에서 사용 가능)
export function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true; // 키워드가 없으면 모든 공지 통과
  return keywords.some(keyword => text.includes(keyword));
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
    
    // 크롤링 날짜 생성 (yymmdd-hh 형식)
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const crawlDate = `${yy}${mm}${dd}-${hh}`;
    
    // 크롤링은 한 번만 수행 (같은 URL이므로)
    const lastKnownNumber = await getLatestNoticeNumber(url, source);
    
    // 공지사항 목록 크롤링 (URL에 따라 분기 - webCrawler에서 처리)
    const crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber);
    
    if (!crawlResult.notices || crawlResult.notices.length === 0) {
      console.log(`[크롤링] ${url}: 새 공지 없음`);
      return totalProcessed;
    }
    
    // DB에 저장 (모든 공지사항 저장) Notice객체를 뺄지 고민중.. -> 어차피 message에 저장하니깐
    await saveNotices(crawlResult.notices, url, crawlDate, source);
    
    // 키워드 필터링 및 알림 전송
    totalProcessed = await filterAndSendNotifications(
      crawlResult.notices,
      keywordDomainPairs,
      crawler,
      url,
      crawlResult
    );
    
    return totalProcessed;
  } catch (error: any) {
    console.error(`[크롤링] ${url} 크롤링 실패:`, error.message);
    throw error;
  }
}

/**
 * 공지사항 목록에 대해 키워드 필터링 및 알림 전송
 * @param notices 공지사항 목록
 * @param keywordDomainPairs 키워드와 도메인ID 쌍 배열
 * @param crawler WebCrawler 인스턴스
 * @param url 크롤링한 URL
 * @param crawlResult 크롤링 결과 (이미지 URL 등 포함)
 * @returns 처리된 알림 수
 */
export async function filterAndSendNotifications(
  notices: NoticePreview[],
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler,
  url: string,
  crawlResult: NoticeResult
): Promise<number> {
  let totalProcessed = 0;
  
  if (!keywordDomainPairs || keywordDomainPairs.length === 0) {
    console.log(`[필터링] 키워드-도메인 쌍이 없어 알림 전송 스킵`);
    return totalProcessed;
  }
  
  // 디버깅: 키워드-도메인 쌍 정보 출력
  console.log(`[디버깅] 필터링 시작: ${notices.length}개 공지사항, ${keywordDomainPairs.length}개 키워드-도메인 쌍`);
  console.log(`[디버깅] 키워드-도메인 쌍:`, JSON.stringify(keywordDomainPairs, null, 2));
  
  // 각 공지사항에 대해 처리
  for (const notice of notices) {
    // 디버깅: 각 공지사항 제목 출력
    console.log(`[디버깅] 공지사항 체크: #${notice.number} "${notice.title}"`);
    
    // 공지사항 제목을 키워드와 비교
    const matchedPairs = keywordDomainPairs.filter(pair => {
      const matched = matchesKeywords(notice.title, [pair.keyword]);
      console.log(`[디버깅] 키워드 "${pair.keyword}" 매칭 결과: ${matched} (제목: "${notice.title}")`);
      return matched;
    });
    
    if (matchedPairs.length === 0) {
      console.log(`[디버깅] 공지사항 #${notice.number} 매칭 없음`);
      continue; // 키워드 매칭 없음
    }
    
    console.log(`[크롤링] 공지사항 #${notice.number} "${notice.title}": ${matchedPairs.length}개 키워드 매칭`);
    
    // 상세 페이지 크롤링 (URL에 따라 분기)
    let detailContent = '';
    let imageUrl: string | undefined = undefined;
    try {
      const detailResult = await crawler.crawlNoticeDetail(url, notice.link);
      detailContent = detailResult.content;
      imageUrl = detailResult.imageUrl;
      console.log(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 완료 (${detailContent.length}자)`);
      if (imageUrl) {
        console.log(`[크롤링] 공지사항 #${notice.number} 이미지 URL 추출: ${imageUrl}`);
      }
    } catch (error: any) {
      console.error(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 실패:`, error.message);
      continue; // 상세 페이지 크롤링 실패 시 스킵
    }
    
    // NoticeResult에 이미지 URL 저장 (첫 번째 이미지만 저장)
    if (imageUrl && !crawlResult.imageUrl) {
      crawlResult.imageUrl = imageUrl;
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
            // 카카오 메시지 전송 (피드 템플릿 사용)
            // 기본 설명 생성
            const description = `번호: ${notice.number}\n링크: ${notice.link}`;
            // 크롤링한 이미지 URL이 있으면 사용, 없으면 기본 이미지 사용
            const imageUrlForMessage = imageUrl || crawlResult.imageUrl || 'https://t1.daumcdn.net/cafeattach/1YmK3/560c6415d44b9ae3c5225a255541c3c2c1568643';
            console.log(`[알림] 공지사항 #${notice.number} "${notice.title}" - 전송할 이미지 URL: ${imageUrlForMessage}`);
            // 메시지 내용 구성 (제목 + 상세 내용)
            const messageContent = `새 공지사항\n제목: ${notice.title}\n번호: ${notice.number}\n\n${detailContent.substring(0, 500)}${detailContent.length > 500 ? '...' : ''}\n\n링크: ${notice.link}`;
            
            // 카카오 메시지 전송
            await sendKakaoMessage(
              setting.user_id,
              notice.title,
              description,
              imageUrlForMessage,
              notice.link
            );
            
            // Message 저장
            const settingId = setting._id ? String(setting._id) : setting.id;
            await saveMessage(settingId, messageContent, 'kakao', notice.link, notice.title, imageUrlForMessage);
            
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
      
      // 디버깅: 작업 데이터 확인
      console.log(`[디버깅] 작업 데이터:`, {
        jobName: job.name,
        url,
        keywordDomainPairs: keywordDomainPairs ? JSON.stringify(keywordDomainPairs, null, 2) : '없음',
        keywordDomainPairsLength: keywordDomainPairs?.length || 0
      });
      
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

