import { NoticeResult } from '../types/notice.js';
import { PKNUCrawler } from './pknuCrawler.js';
import { TestCrawler } from './testCrawler.js';
import { KStartupCrawler } from './kstartupCrawler.js';
import { MSSCrawler } from './mssCrawler.js';
import { CampuspickCrawler } from './campuspickCrawler.js';
import { extractDomainName } from '../utils/urlUtils.js';

// 상세 페이지 크롤링 결과
export interface NoticeDetailResult {
  content: string;
  imageUrl?: string;
}

// 크롤러 인터페이스
interface SiteCrawler {
  crawlNoticesList(lastKnownNumber: string | null, maxPages?: number): Promise<NoticeResult>;
  crawlNoticeDetail(noticeLink: string): Promise<NoticeDetailResult>;
  close(): Promise<void>;
}

export class WebCrawler {
  private crawlerMap: Map<string, SiteCrawler> = new Map();

  // URL에 따라 적절한 크롤러 선택
  private getCrawler(url: string): SiteCrawler {
    // 이미 생성된 크롤러가 있으면 재사용
    if (this.crawlerMap.has(url)) {
      return this.crawlerMap.get(url)!;
    }

    let crawler: SiteCrawler;

    // 도메인 이름으로 크롤러 선택
    const domainName = extractDomainName(url);
    const lowerDomainName = domainName.toLowerCase();
    
    switch (lowerDomainName) {
      case 'pknu':
        crawler = new PKNUCrawler();
        break;
      case 'preview--pknu-notice-watch':
        console.log(`[WebCrawler] TestCrawler 사용: ${url}`);
        crawler = new TestCrawler(url);
        break;
      case 'k-startup':
        console.log(`[WebCrawler] KStartupCrawler 사용: ${url}`);
        crawler = new KStartupCrawler();
        break;
      case 'mss':
      case 'mss.go.kr':
        console.log(`[WebCrawler] MSSCrawler 사용: ${url}`);
        crawler = new MSSCrawler();
        break;
      case 'campuspick':
      case 'campuspick.com':
        console.log(`[WebCrawler] CampuspickCrawler 사용: ${url}`);
        crawler = new CampuspickCrawler();
        break;
      // TestCrawler를 범용 크롤러로 사용 (테이블 구조 지원)
      default:
        console.log(`[WebCrawler] TestCrawler 사용 (기본): ${url}`);
        crawler = new TestCrawler(url);
    }

    this.crawlerMap.set(url, crawler);
    return crawler;
  }

  // 공지사항 목록 크롤링 (URL에 따라 분기)
  async crawlNoticesList(url: string, lastKnownNumber: string | null = null, maxPages?: number): Promise<NoticeResult> {
    try {
      const crawler = this.getCrawler(url);
      return await crawler.crawlNoticesList(lastKnownNumber, maxPages);
    } catch (error: any) {
      console.error(`[WebCrawler] 크롤링 실패 (${url}):`, error.message);
      // 빈 결과 반환
      return {
        url: url,
        title: '',
        timestamp: new Date().toISOString(),
        totalNotices: 0,
        notices: [],
        summary: {
          extractedAt: new Date().toISOString(),
          source: '',
          totalCount: 0
        }
      };
    }
  }

  // 공지사항 상세 페이지 크롤링 (URL에 따라 분기)
  async crawlNoticeDetail(url: string, noticeLink: string): Promise<NoticeDetailResult> {
    const crawler = this.getCrawler(url);
    return await crawler.crawlNoticeDetail(noticeLink);
  }

  // 브라우저 종료
  async close(): Promise<void> {
    // 모든 크롤러 종료
    for (const crawler of this.crawlerMap.values()) {
      await crawler.close();
    }
    this.crawlerMap.clear();
  }
}

