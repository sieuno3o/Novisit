import { chromium, Browser } from 'playwright';
import { PKNUNoticeResult } from '../types/crawl.js';

export class WebCrawler {
  private browser: Browser | null = null;

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

  // 부경대학교 공지사항 크롤링
  async crawlPKNUNotices(url: string = 'https://www.pknu.ac.kr/main/163'): Promise<PKNUNoticeResult> {
    try {
      const browser = await this.initBrowser();
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
      });
      
      const page = await context.newPage();
      
      // 페이지 로드
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // 테이블 로딩 대기
      await page.waitForSelector('tbody tr', { timeout: 10000 });
      
      // 페이지 제목 먼저 가져오기
      const pageTitle = await page.title();
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        const notices: any[] = [];
        
        rows.forEach((row: Element) => {
          const tr = row as HTMLTableRowElement;
          const cells = tr.querySelectorAll('td');
          
          if (cells.length >= 2) {
            // 번호 추출 (td.bdlNum.noti)
            const numberCell = tr.querySelector('td.bdlNum.noti');
            const number = numberCell?.textContent?.trim() || '';
            
            // 제목과 링크 추출 (td.bdlTitle a)
            const titleCell = tr.querySelector('td.bdlTitle a');
            const title = titleCell?.textContent?.trim() || '';
            const link = titleCell?.getAttribute('href') || '';
            const fullLink = link.startsWith('http') ? link : `https://www.pknu.ac.kr${link}`;
            
            // 번호와 제목이 있는 공지사항만 수집
            if (number && title) {
              notices.push({
                number: number,
                title: title,
                link: fullLink,
                postedAt: new Date().toISOString().split('T')[0], // 크롤링한 날짜 사용
                crawledAt: new Date()
              });
            }
          }
        });
        
        return notices;
      });
      
      await context.close();
      
      console.log(`[PKNU] 크롤링 완료: ${notices.length}개 공지사항 | ${url}`);
      
      return {
        url: url,
        title: pageTitle,
        timestamp: new Date().toISOString(),
        totalNotices: notices.length,
        notices: notices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: '부경대학교 공지사항',
          totalCount: notices.length
        }
      };
      
    } catch (error) {
      console.error(`[PKNU] 크롤링 실패: ${(error as Error).message} | ${url}`);
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

