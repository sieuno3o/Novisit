import { chromium, Browser } from 'playwright';
import { NoticeResult, NoticePreview } from '../types/notice.js';
import { NoticeDetailResult } from './webCrawler.js';

export class TestCrawler {
  private browser: Browser | null = null;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // 브라우저 인스턴스 초기화
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ]
      });
    }
    return this.browser;
  }

  // 한 페이지의 공지사항 크롤링
  private async crawlPage(pageIndex: number, lastKnownNumber: string | null): Promise<{ notices: NoticePreview[], shouldContinue: boolean }> {
    const url = pageIndex === 1 
      ? this.baseUrl 
      : `${this.baseUrl}?pageIndex=${pageIndex}`;
    
    const browser = await this.initBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // 페이지가 완전히 로드될 때까지 대기 (React 앱의 경우)
      await page.waitForTimeout(2000);
      
      // 공지사항 목록이 로드될 때까지 대기 (테이블 구조 또는 다른 구조)
      await page.waitForSelector('tbody tr, article, a[href*="/notice/"]', { timeout: 10000 });
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const notices: any[] = [];
        
        try {
          // 테이블 구조 (pknu와 유사)
          const rows = document.querySelectorAll('tbody tr');
          
          if (rows.length === 0) {
            throw new Error('tbody tr 요소를 찾을 수 없습니다.');
          }
          
          rows.forEach((row: Element) => {
            const tr = row as HTMLTableRowElement;
            
            // 고정 공지 제외 (필요시)
            if (tr.classList.contains('noti')) return;
            
            const numberCell = tr.querySelector('td.bdlNum, td:first-child') as HTMLElement | null;
            const cells = tr.querySelectorAll('td');
            if (cells.length < 2) return;
            
            // 번호 텍스트 정제 (숫자만 추출)
            const rawNumber = numberCell?.textContent?.trim() || '';
            const number = rawNumber.replace(/[^0-9]/g, '');
            
            // 번호가 없거나 "NOTICE" 같은 텍스트인 경우 스킵
            if (!number || number.length === 0) return;
            
            const titleCell = tr.querySelector('td.bdlTitle a, td a[href*="/notice/"], td:nth-child(2) a') as HTMLAnchorElement | null;
            const title = titleCell?.textContent?.trim() || '';
            const link = titleCell?.getAttribute('href') || '';
            
            // href 처리 (동적 base URL 사용)
            let fullLink: string;
            const baseUrl = window.location.origin;
            if (link.startsWith('http')) {
              fullLink = link;
            } else if (link.startsWith('?')) {
              fullLink = `${baseUrl}${link}`;
            } else {
              fullLink = `${baseUrl}${link}`;
            }
            
            if (number && title) {
              notices.push({
                number: number,
                title: title,
                link: fullLink,
                postedAt: new Date().toISOString().split('T')[0],
                crawledAt: new Date()
              });
            }
          });
        } catch (error) {
          console.error('[TestCrawler] 공지사항 목록 크롤링 실패:', error);
          throw error;
        }
        
        return notices;
      });
      
      await context.close();
      
      // 이전 크롤링 번호를 찾았는지 확인
      const foundLastKnown = lastKnownNumber 
        ? notices.some(n => n.number === lastKnownNumber)
        : false;
      
      // 필터링: 이전 번호보다 큰 것만
      const newNotices = lastKnownNumber
        ? notices.filter(n => parseInt(n.number) > parseInt(lastKnownNumber))
        : notices;
      
      return {
        notices: newNotices,
        shouldContinue: !foundLastKnown && notices.length > 0
      };
      
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  // 공지사항 목록 크롤링
  async crawlNoticesList(lastKnownNumber: string | null = null): Promise<NoticeResult> {
    try {
      const allNewNotices: NoticePreview[] = [];
      let pageIndex = 1;
      let shouldContinue = true;
      
      console.log(`[TestCrawler] 증분 크롤링 시작 (마지막 번호: ${lastKnownNumber || '없음'})`);
      
      // 페이지별로 크롤링
      while (shouldContinue && pageIndex <= 3) { // 최대 3페이지
        console.log(`[TestCrawler] 페이지 ${pageIndex} 크롤링 중...`);
        
        const result = await this.crawlPage(pageIndex, lastKnownNumber);
        
        if (result.notices.length > 0) {
          allNewNotices.push(...result.notices);
          console.log(`[TestCrawler] 페이지 ${pageIndex}: ${result.notices.length}개 새 공지 발견`);
        }
        
        shouldContinue = result.shouldContinue;
        
        if (shouldContinue) {
          pageIndex++;
          // 페이지 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`[TestCrawler] 이전 크롤링 지점 도달 (페이지 ${pageIndex})`);
        }
      }
      
      console.log(`[TestCrawler] 크롤링 완료: 총 ${allNewNotices.length}개 새 공지사항 (${pageIndex}페이지 탐색)`);
      
      return {
        url: this.baseUrl,
        title: '공지사항 목록',
        timestamp: new Date().toISOString(),
        totalNotices: allNewNotices.length,
        notices: allNewNotices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: this.baseUrl,
          totalCount: allNewNotices.length
        }
      };
      
    } catch (error) {
      console.error(`[TestCrawler] 크롤링 실패:`, error);
      throw error;
    }
  }

  // 공지사항 상세 페이지 크롤링
  async crawlNoticeDetail(noticeLink: string): Promise<NoticeDetailResult> {
    const browser = await this.initBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(noticeLink, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // 페이지가 완전히 로드될 때까지 대기 (React 앱의 경우)
      await page.waitForTimeout(2000);
      
      // 본문이 로드될 때까지 대기 (div.container 안의 div.whitespace-pre-wrap.text-foreground.leading-relaxed)
      await page.waitForSelector('div.container div.whitespace-pre-wrap.text-foreground.leading-relaxed', { 
        timeout: 10000 
      });
      
      // 공지사항 본문 텍스트 추출
      const result = await page.evaluate(() => {
        // div.container 안에서 class가 "whitespace-pre-wrap text-foreground leading-relaxed"인 div 찾기
        const container = document.querySelector('div.container');
        
        if (!container) {
          return { content: '' };
        }
        
        const contentElement = container.querySelector('div.whitespace-pre-wrap.text-foreground.leading-relaxed');
        
        if (!contentElement) {
          return { content: '' };
        }
        
        // 스크립트와 스타일 제거
        const clone = contentElement.cloneNode(true) as HTMLElement;
        const scripts = clone.querySelectorAll('script, style, nav, header, footer, aside');
        scripts.forEach(el => el.remove());
        
        // 본문 텍스트 추출
        const content = clone.textContent?.trim() || '';
        
        return { content: content.trim() };
      });
      
      await context.close();
      
      return { content: result.content };
      
    } catch (error) {
      await context.close();
      console.error(`[TestCrawler] 상세 페이지 크롤링 실패 (${noticeLink}):`, error);
      throw error;
    }
  }

  // 브라우저 종료
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

