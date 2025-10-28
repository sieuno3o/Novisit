import { chromium, Browser } from 'playwright';
import { PKNUNoticeResult, PKNUNotice } from '../types/crawl.js';

export class WebCrawler {
  private browser: Browser | null = null;
  private readonly PKNU_BASE_URL = 'https://www.pknu.ac.kr/main/163';

  // 브라우저 인스턴스 초기화 (헤드리스 고정)
  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',                // Docker 환경에서 필수
          '--disable-setuid-sandbox',    // Docker 환경에서 필수
          '--disable-dev-shm-usage',     // 공유 메모리 문제 방지
        ]
      });
    }
    return this.browser;
  }

  // 한 페이지의 공지사항 크롤링
  private async crawlPage(pageIndex: number, lastKnownNumber: string | null): Promise<{ notices: PKNUNotice[], shouldContinue: boolean }> {
    const url = pageIndex === 1 
      ? this.PKNU_BASE_URL 
      : `${this.PKNU_BASE_URL}?pageIndex=${pageIndex}`;
    
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
      
      await page.waitForSelector('tbody tr', { timeout: 10000 });
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        const notices: any[] = [];
        
        rows.forEach((row: Element) => {
          const tr = row as HTMLTableRowElement;
          const cells = tr.querySelectorAll('td');
          
          if (cells.length >= 2) {
            const numberCell = tr.querySelector('td.bdlNum.noti');
            const number = numberCell?.textContent?.trim() || '';
            
            const titleCell = tr.querySelector('td.bdlTitle a');
            const title = titleCell?.textContent?.trim() || '';
            const link = titleCell?.getAttribute('href') || '';
            const fullLink = link.startsWith('http') ? link : `https://www.pknu.ac.kr${link}`;
            
            if (number && title) {
              notices.push({
                number: number,
                title: title,
                link: fullLink,
                postedAt: new Date().toISOString().split('T')[0],
                crawledAt: new Date()
              });
            }
          }
        });
        
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

  // 부경대학교 공지사항 증분 크롤링 (새 공지만)
  async crawlPKNUNotices(lastKnownNumber: string | null = null): Promise<PKNUNoticeResult> {
    try {
      const allNewNotices: PKNUNotice[] = [];
      let pageIndex = 1;
      let shouldContinue = true;
      
      console.log(`[PKNU] 증분 크롤링 시작 (마지막 번호: ${lastKnownNumber || '없음'})`);
      
      // 페이지별로 크롤링
      while (shouldContinue && pageIndex <= 3) { // 최대 3페이지
        console.log(`[PKNU] 페이지 ${pageIndex} 크롤링 중...`);
        
        const result = await this.crawlPage(pageIndex, lastKnownNumber);
        
        if (result.notices.length > 0) {
          allNewNotices.push(...result.notices);
          console.log(`[PKNU] 페이지 ${pageIndex}: ${result.notices.length}개 새 공지 발견`);
        }
        
        shouldContinue = result.shouldContinue;
        
        if (shouldContinue) {
          pageIndex++;
          // 페이지 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`[PKNU] 이전 크롤링 지점 도달 (페이지 ${pageIndex})`);
        }
      }
      
      console.log(`[PKNU] 크롤링 완료: 총 ${allNewNotices.length}개 새 공지사항 (${pageIndex}페이지 탐색)`);
      
      return {
        url: this.PKNU_BASE_URL,
        title: '부경대학교 공지사항',
        timestamp: new Date().toISOString(),
        totalNotices: allNewNotices.length,
        notices: allNewNotices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: '부경대학교 공지사항',
          totalCount: allNewNotices.length
        }
      };
      
    } catch (error) {
      console.error(`[PKNU] 크롤링 실패: ${(error as Error).message}`);
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

