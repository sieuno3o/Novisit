import express from 'express';
import { WebCrawler } from '../crawl/webCrawler.js';
import { getLatestNoticeNumber, saveNotices } from '../repository/mongodb/noticeRepository.js';
import { getSourceFromUrl } from '../utils/urlUtils.js';
import { filterAndSendNotifications } from '../services/noticeFilterService.js';
import { KeywordDomainPair } from '../types/job.js';
import { JobScheduler } from '../schedule/jobScheduler.js';
import { formatCrawlDate } from '../utils/dateUtils.js';

export function registerCrawltestApi(app: express.Application) {
  // 즉시 수동 크롤링 테스트 엔드포인트 (POST /crawltest)
  // 기존 크롤링 로직을 직접 사용하여 테스트
  app.post('/crawltest', async (req, res) => {
    const crawler = new WebCrawler();
    
    try {
      // 요청에서 URL 가져오기 (기본값: 부경대학교 공지사항)
      const url = req.body?.url || 'https://www.pknu.ac.kr/main/163';
      // 요청에서 키워드-도메인 쌍 가져오기 (선택사항)
      let keywordDomainPairs: KeywordDomainPair[] = req.body?.keywordDomainPairs || [];
      
      // 키워드-도메인 쌍이 없으면 jobScheduler의 createCrawlJobs 로직 사용
      if (keywordDomainPairs.length === 0) {
        console.log(`[크롤링 테스트] 키워드-도메인 쌍이 없어 jobScheduler 로직으로 생성 시도`);
        const jobScheduler = new JobScheduler();
        const crawlJobs = await jobScheduler.createCrawlJobs();
        
        // 해당 URL에 해당하는 CrawlJob 찾기
        const matchedJob = crawlJobs.find(job => job.url === url);
        if (matchedJob) {
          keywordDomainPairs = matchedJob.keywordDomainPairs;
          console.log(`[크롤링 테스트] URL "${url}"에 해당하는 키워드-도메인 쌍 ${keywordDomainPairs.length}개 발견:`, keywordDomainPairs);
        } else {
          console.log(`[크롤링 테스트] URL "${url}"에 해당하는 키워드-도메인 쌍을 찾을 수 없음`);
        }
      }
      
      console.log(`[크롤링 테스트] 시작: ${url}`);
      if (keywordDomainPairs.length > 0) {
        console.log(`[크롤링 테스트] 키워드-도메인 쌍: ${keywordDomainPairs.length}개`);
      }
      
      // URL에서 소스 이름 추출 (PKNU, NAVER 등)
      const source = getSourceFromUrl(url);
      
      // 크롤링 날짜 생성 (yymmdd-hh 형식)
      const crawlDate = formatCrawlDate();
      
      // 최신 공지번호 조회 (기존 로직 사용)
      const lastKnownNumber = await getLatestNoticeNumber(url, source);
      console.log(`[크롤링 테스트] 최신 공지번호: ${lastKnownNumber || '없음'}`);
      
      // 공지사항 목록 크롤링 (기존 WebCrawler 사용)
      const crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber);
      
      if (!crawlResult.notices || crawlResult.notices.length === 0) {
        console.log(`[크롤링 테스트] 새 공지 없음`);
        await crawler.close();
        
        return res.status(200).json({
          ok: true,
          success: true,
          message: '크롤링 완료: 새 공지 없음',
          url,
          source,
          crawlDate,
          lastKnownNumber,
          totalNotices: 0,
          newNotices: 0,
          executedAt: new Date().toISOString(),
        });
      }
      
      console.log(`[크롤링 테스트] ${crawlResult.notices.length}개 새 공지 발견`);
      
      // DB에 저장 (기존 saveNotices 함수 사용)
      const latestNumber = await saveNotices(crawlResult.notices, url, crawlDate, source);
      
      console.log(`[크롤링 테스트] 저장 완료: 최신 번호 ${latestNumber}`);
      
      // 키워드 필터링 및 알림 전송 (키워드-도메인 쌍이 있는 경우)
      let notificationsSent = 0;
      if (keywordDomainPairs.length > 0) {
        console.log(`[크롤링 테스트] 키워드 필터링 및 알림 전송 시작`);
        try {
          notificationsSent = await filterAndSendNotifications(
            crawlResult.notices,
            keywordDomainPairs,
            crawler,
            url,
            crawlResult
          );
          console.log(`[크롤링 테스트] 알림 전송 완료: ${notificationsSent}개`);
        } catch (error: any) {
          console.error(`[크롤링 테스트] 알림 전송 중 오류:`, error.message);
          // 알림 전송 실패해도 크롤링은 성공으로 처리
        }
      } else {
        console.log(`[크롤링 테스트] 키워드-도메인 쌍이 없어 알림 전송 스킵`);
      }
      
      // 크롤러 정리
      await crawler.close();
      
      // 성공 응답
      return res.status(200).json({
        ok: true,
        success: true,
        message: keywordDomainPairs.length > 0 
          ? `크롤링, 저장 및 알림 전송 완료 (${notificationsSent}개 알림)`
          : '크롤링 및 저장 완료',
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
