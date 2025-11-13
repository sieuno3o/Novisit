import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor } from '../types/crawl.js';
import { saveNotices, getLatestNoticeNumber, getNoticesByUrl, saveCrawlMetaOnly } from '../repository/mongodb/noticeRepository.js';
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
      console.log(`[Job] ${job.name} 시작: 새로운 로직 - 크롤링 → 저장 → 필터링 → 메시지 전송`);
      
      // 크롤링 날짜 생성 (yymmdd-hh 형식)
      const now = new Date();
      const yy = now.getFullYear().toString().slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const crawlDate = `${yy}${mm}${dd}-${hh}`;
      
      // ========== 1단계: 모든 도메인의 URL 리스트 중복 제거 및 크롤링 ==========
      console.log(`[Job] 1단계: 크롤링 및 저장 시작 (${crawlDate})`);
      
      // Domain 조회
      const domains = await findAllDomains();
      console.log(`[Job] ${domains.length}개 Domain 발견`);
      // 디버깅: 첫 번째 Domain의 구조 확인
      if (domains.length > 0 && domains[0]) {
        const firstDomain = domains[0];
        console.log(`[Job] 첫 번째 Domain 디버그:`, {
          _id: firstDomain._id,
          id: (firstDomain as any).id,
          name: firstDomain.name,
          has_id_property: '_id' in firstDomain,
          keys: Object.keys(firstDomain || {})
        });
      }
      
      // 모든 Domain의 url_list를 중복 제거하여 하나로 합치기
      const uniqueUrls = new Set<string>();
      const urlToDomainMap: Map<string, string[]> = new Map(); // URL -> 해당 URL을 가진 Domain 이름들
      
      for (const domain of domains) {
        if (!domain.url_list || domain.url_list.length === 0) {
          continue;
        }
        
        for (const url of domain.url_list) {
          if (url.includes('pknu')) {
            uniqueUrls.add(url);
            if (!urlToDomainMap.has(url)) {
              urlToDomainMap.set(url, []);
            }
            urlToDomainMap.get(url)!.push(domain.name);
          }
        }
      }
      
      console.log(`[Job] 중복 제거된 URL: ${uniqueUrls.size}개`);
      uniqueUrls.forEach(url => {
        const domains = urlToDomainMap.get(url) || [];
        console.log(`[Job] URL "${url}": ${domains.length}개 Domain에 포함 (${domains.join(', ')})`);
      });
      
      let totalNoticesCrawled = 0;
      // 1단계에서 저장한 새 공지들을 추적 (key: url, value: 새로 저장한 공지 배열)
      const newlySavedNotices: Map<string, any[]> = new Map();
      
      // 중복 제거된 URL 리스트로 크롤링
      for (const url of uniqueUrls) {
        try {
          // URL별 마지막 번호 조회
          const lastKnownNumber = await getLatestNoticeNumber(url, 'PKNU');
          console.log(`[Job] URL "${url}": 마지막 번호 ${lastKnownNumber || '없음'}`);
          
          // 크롤링 실행 (URL 파라미터 추가)
          const crawlResult = await crawler.crawlPKNUNotices(url, lastKnownNumber);
          
          // Notice에 저장 (crawlDate, url 포함, 필터링 전 모든 공지 저장)
          // 공지가 없어도 메타데이터는 저장됨 (이전 시간대 번호 사용)
          const savedLatestNumber = await saveNotices(
            crawlResult.notices || [], 
            url, 
            crawlDate, 
            'PKNU'
          );
          
          if (crawlResult.notices && crawlResult.notices.length > 0) {
            totalNoticesCrawled += crawlResult.notices.length;
            // 새로 저장한 공지들을 Map에 저장 (2단계에서 사용)
            newlySavedNotices.set(url, crawlResult.notices);
            console.log(`[Job] URL "${url}": ${crawlResult.notices.length}개 공지 저장 완료 | 최신번호: ${savedLatestNumber}`);
          } else {
            console.log(`[Job] URL "${url}": 새 공지 없음 | 최신번호: ${savedLatestNumber || '없음'}`);
          }
        } catch (error: any) {
          console.error(`[Job] URL "${url}" 크롤링 실패:`, error.message);
          
          // 크롤링 실패 시에도 메타데이터 저장
          try {
            await saveCrawlMetaOnly(url, crawlDate, 'PKNU');
          } catch (metaError: any) {
            console.error(`[Job] URL "${url}" 메타데이터 저장 실패:`, metaError.message);
          }
          
          // 개별 URL 실패는 전체 작업을 중단하지 않음
          continue;
        }
      }
      
      console.log(`[Job] 1단계 완료: 총 ${totalNoticesCrawled}개 공지 저장 (${newlySavedNotices.size}개 URL)`);
      
      // ========== 2단계: 새로 저장한 Notice만 필터링 ==========
      console.log(`[Job] 2단계: 새로 저장한 Notice 필터링 시작`);
      
      let totalMessagesSent = 0;
      
      // 각 Domain별로 처리
      for (const domain of domains) {
        if (!domain.url_list || domain.url_list.length === 0) {
          continue;
        }
        
        // 해당 Domain의 Settings 조회
        // findAllDomains에서 이미 _id가 문자열로 변환되어 반환됨
        const domainId = (domain as any)._id;
        if (!domainId) {
          console.error(`[Job] Domain "${domain.name}": _id를 찾을 수 없음`, domain);
          continue;
        }
        console.log(`[Job] Domain "${domain.name}": domainId = "${domainId}", setting_ids = ${JSON.stringify((domain as any).setting_ids || [])}`);
        const settings = await getSettingsByDomainId(domainId);
        console.log(`[Job] Domain "${domain.name}": 조회된 Settings 개수 = ${settings.length}`);
        
        if (settings.length === 0) {
          console.log(`[Job] Domain "${domain.name}": Setting 없음, 스킵`);
          continue;
        }
        
        console.log(`[Job] Domain "${domain.name}": ${settings.length}개 Setting 발견`);
        
        // Domain의 각 URL별로 새로 저장한 공지만 필터링
        for (const domainUrl of domain.url_list) {
          if (!domainUrl.includes('pknu')) {
            continue;
          }
          
          // 1단계에서 저장한 새 공지만 가져오기 (모든 공지 조회 X)
          const newlySaved = newlySavedNotices.get(domainUrl);
          
          if (!newlySaved || newlySaved.length === 0) {
            console.log(`[Job] Domain "${domain.name}" URL "${domainUrl}": 새로 저장한 공지 없음`);
            continue;
          }
          
          // Domain keywords로 1차 필터링
          const domainFilteredNotices = newlySaved.filter(notice =>
            matchesKeywords(notice.title, domain.keywords || [])
          );
          
          console.log(`[Job] Domain "${domain.name}" URL "${domainUrl}": ${newlySaved.length}개 중 ${domainFilteredNotices.length}개가 Domain keywords 매칭`);
          
          if (domainFilteredNotices.length === 0) {
            continue;
          }
          
          // 각 Setting별로 2차 필터링 및 메시지 전송
          for (const setting of settings) {
            // Setting filter_keywords로 2차 필터링
            const settingFilteredNotices = domainFilteredNotices.filter(notice =>
              matchesKeywords(notice.title, setting.filter_keywords || [])
            );
            
            if (settingFilteredNotices.length === 0) {
              console.log(`[Job] Setting "${setting.name}": 필터링 결과 매칭 없음`);
              continue;
            }
            
            console.log(`[Job] Setting "${setting.name}": ${settingFilteredNotices.length}개 공지 매칭`);
            
            // ========== 3단계: 메시지 전송 ==========
            for (const notice of settingFilteredNotices) {
              try {
                // 카카오 메시지 전송 (피드 템플릿 사용)
                // notice.description이 있으면 사용, 없으면 기본값 생성
                const description = notice.description || `번호: ${notice.number}\n링크: ${notice.link}`;
                // notice.imageUrl이 있으면 사용, 없으면 기본 이미지 사용
                const imageUrl = notice.imageUrl || 'https://t1.daumcdn.net/cafeattach/1YmK3/560c6415d44b9ae3c5225a255541c3c2c1568643';
                
                await sendKakaoMessage(
                  setting.user_id,
                  notice.title,
                  description,
                  imageUrl,
                  notice.link
                );
                
                // Message 저장 (제목과 설명을 내용으로 저장)
                const messageToSave = `[공지] ${notice.title}\n${description}`;
                const settingId = setting._id || setting.id;
                await saveMessage(settingId, messageToSave, 'kakao');
                
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
        }
      }
      
      console.log(`[Job] 2단계 완료: 총 ${totalMessagesSent}개 메시지 전송`);
      
      result = {
        success: true,
        executedAt: new Date(),
        totalNoticesCrawled,
        totalMessagesSent,
        message: `크롤링/저장: ${totalNoticesCrawled}개, 메시지 전송: ${totalMessagesSent}개`
      };
      
      console.log(`[Job] ${job.name} 완료: ${totalNoticesCrawled}개 공지 저장, ${totalMessagesSent}개 메시지 전송`);
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

