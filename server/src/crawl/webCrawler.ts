import { NoticeResult } from '../types/crawl.js';
import { PKNUCrawler } from './pknuCrawler.js';
import { extractDomainName } from '../utils/urlUtils.js';

// 크롤러 인터페이스
interface SiteCrawler {
  crawlNoticesList(lastKnownNumber: string | null): Promise<NoticeResult>;
  crawlNoticeDetail(noticeLink: string): Promise<string>;
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
    
    switch (domainName.toLowerCase()) {
      case 'pknu':
        crawler = new PKNUCrawler();
        break;
      // 향후 다른 사이트 추가 시 여기에 추가
      // case 'naver':
      //   crawler = new NaverCrawler();
      //   break;
      default:
        // 기본값: PKNU (현재는 PKNU만 지원)
        console.warn(`[WebCrawler] 지원하지 않는 도메인: ${domainName} (${url}), PKNU 크롤러 사용`);
        crawler = new PKNUCrawler();
    }

    this.crawlerMap.set(url, crawler);
    return crawler;
  }

  // 공지사항 목록 크롤링 (URL에 따라 분기)
  async crawlNoticesList(url: string, lastKnownNumber: string | null = null): Promise<NoticeResult> {
    try {
      const crawler = this.getCrawler(url);
      return await crawler.crawlNoticesList(lastKnownNumber);
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
  async crawlNoticeDetail(url: string, noticeLink: string): Promise<string> {
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

  // 하위 호환성을 위한 메서드 (기존 코드 호환)
  async crawlPKNUNotices(lastKnownNumber: string | null = null): Promise<NoticeResult> {
    const pknuUrl = 'https://www.pknu.ac.kr/main/163';
    return await this.crawlNoticesList(pknuUrl, lastKnownNumber);
  }
}

