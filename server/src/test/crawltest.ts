import express from 'express';
import { WebCrawler } from '../crawl/webCrawler.js';
import { crawlAndFilterByKeywords } from '../services/noticeFilterService.js';
import { KeywordDomainPair, CrawlJob } from '../types/job.js';
import { JobScheduler } from '../schedule/jobScheduler.js';
import { getLatestNoticeNumber, saveNotices } from '../repository/mongodb/noticeRepository.js';
import { getSourceFromUrl } from '../utils/urlUtils.js';
import { formatCrawlDate } from '../utils/dateUtils.js';

/**
 * 단일 URL에 대한 크롤링 작업 처리
 * @param url 크롤링할 URL
 * @param keywordDomainPairs 키워드-도메인 쌍 배열
 * @param crawler WebCrawler 인스턴스
 * @returns 크롤링 결과
 */
async function processSingleUrl(
  url: string,
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler
): Promise<{
  success: boolean;
  url: string;
  source: string;
  crawlDate: string;
  lastKnownNumber: string | null;
  totalNotices: number;
  newNotices: number;
  latestNumber: string | null;
  notificationsSent: number;
  notices: any[];
  error?: string;
}> {
  const source = getSourceFromUrl(url);
  const crawlDate = formatCrawlDate();
  
  try {
    // 키워드-도메인 쌍이 없으면 에러 발생
    if (!keywordDomainPairs || keywordDomainPairs.length === 0) {
      throw new Error(`키워드-도메인 쌍이 없습니다. URL: ${url}`);
    }
    
    const lastKnownNumber = await getLatestNoticeNumber(url, source);
    console.log(`[크롤링 테스트] URL: ${url}, 최신 공지번호: ${lastKnownNumber || '없음'}`);
    console.log(`[크롤링 테스트] 키워드-도메인 쌍 ${keywordDomainPairs.length}개로 크롤링 시작`);
    
    // crawlAndFilterByKeywords 사용 (크롤링, 저장, 필터링, 알림 전송 모두 처리)
    const notificationsSent = await crawlAndFilterByKeywords(url, keywordDomainPairs, crawler);
    
    // 크롤링 결과를 가져오기 위해 다시 조회
    const crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber);
    const latestNumber = await getLatestNoticeNumber(url, source);
    
    return {
      success: true,
      url,
      source,
      crawlDate,
      lastKnownNumber,
      totalNotices: crawlResult.totalNotices,
      newNotices: crawlResult.notices.length,
      latestNumber,
      notificationsSent,
      notices: crawlResult.notices.map(notice => ({
        number: notice.number,
        title: notice.title,
        link: notice.link,
        postedAt: notice.postedAt,
      })),
    };
  } catch (error: any) {
    console.error(`[크롤링 테스트] ${url} 처리 실패:`, error.message);
    return {
      success: false,
      url,
      source,
      crawlDate,
      lastKnownNumber: null,
      totalNotices: 0,
      newNotices: 0,
      latestNumber: null,
      notificationsSent: 0,
      notices: [],
      error: error.message,
    };
  }
}

export function registerCrawltestApi(app: express.Application) {
  // 즉시 수동 크롤링 테스트 엔드포인트 (POST /crawltest)
  // DB에 있는 도메인 정보를 기반으로 기존 로직대로 크롤링 수행
  app.post('/crawltest', async (req, res) => {
    const crawler = new WebCrawler();
    
    try {
      // JobScheduler를 사용하여 DB의 모든 도메인 정보를 기반으로 크롤링 작업 생성
      // 기존 로직과 동일하게 URL과 KeywordDomainPair 생성
      const jobScheduler = new JobScheduler();
      const crawlJobs = await jobScheduler.createCrawlJobs();
      
      if (crawlJobs.length === 0) {
        await crawler.close();
        return res.status(200).json({
          ok: true,
          success: true,
          message: '크롤링할 작업이 없습니다.',
          results: [],
          totalProcessed: 0,
          totalNewNotices: 0,
          totalNotificationsSent: 0,
          executedAt: new Date().toISOString(),
        });
      }
      
      console.log(`[크롤링 테스트] DB에서 가져온 작업 수: ${crawlJobs.length}개`);
      
      // 각 작업 처리 (DB에서 가져온 모든 작업)
      const results = [];
      let totalNotificationsSent = 0;
      
      for (const job of crawlJobs) {
        try {
          const result = await processSingleUrl(
            job.url,
            job.keywordDomainPairs,
            crawler
          );
          results.push(result);
          totalNotificationsSent += result.notificationsSent;
        } catch (error: any) {
          console.error(`[크롤링 테스트] ${job.url} 처리 실패:`, error.message);
          results.push({
            success: false,
            url: job.url,
            source: getSourceFromUrl(job.url),
            crawlDate: formatCrawlDate(),
            lastKnownNumber: null,
            totalNotices: 0,
            newNotices: 0,
            latestNumber: null,
            notificationsSent: 0,
            notices: [],
            error: error.message,
          });
        }
      }
      
      // 크롤러 정리
      await crawler.close();
      
      // 성공 응답
      const allSuccess = results.every(r => r.success);
      const totalNewNotices = results.reduce((sum, r) => sum + r.newNotices, 0);
      
      return res.status(allSuccess ? 200 : 207).json({
        ok: allSuccess,
        success: allSuccess,
        message: results.length === 1 && results[0]
          ? (results[0].notificationsSent > 0
              ? `크롤링, 저장 및 알림 전송 완료 (${results[0].notificationsSent}개 알림)`
              : '크롤링 및 저장 완료')
          : `${results.length}개 URL 처리 완료 (총 ${totalNewNotices}개 새 공지, ${totalNotificationsSent}개 알림)`,
        results: results,
        totalProcessed: results.length,
        totalNewNotices,
        totalNotificationsSent,
        executedAt: new Date().toISOString(),
      });
      
    } catch (error: any) {
      console.error('❌ 크롤링 테스트 오류:', error);
      
      // 크롤러 정리 (에러 발생 시에도)
      try {
        await crawler.close();
      } catch (closeError) {
        console.error('크롤러 종료 오류:', closeError);
      }
      
      return res.status(500).json({
        ok: false,
        success: false,
        error: error.message || '크롤링 실패',
        executedAt: new Date().toISOString(),
      });
    }
  });
}
