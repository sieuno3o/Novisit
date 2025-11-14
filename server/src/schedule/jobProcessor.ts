import { Job } from 'bullmq';
import { WebCrawler } from '../crawl/webCrawler.js';
import { JobData, JobResult, JobProcessor } from '../types/job.js';
import { crawlAndFilterByKeywords } from '../services/noticeFilterService.js';

/**
 * BullMQ 작업 프로세서
 * 크롤링 작업을 처리하는 함수
 */
export const processJob: JobProcessor = async (job) => {
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

