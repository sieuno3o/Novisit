import { chromium, Browser } from 'playwright';
import { NoticeResult, Notice } from '../types/crawl.js';

export class PKNUCrawler {
  private browser: Browser | null = null;
  private readonly PKNU_BASE_URL = 'https://www.pknu.ac.kr/main/163';

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
  private async crawlPage(pageIndex: number, lastKnownNumber: string | null): Promise<{ notices: Notice[], shouldContinue: boolean }> {
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
      
      // 공지사항 데이터 추출 (고정 공지 제외: tr.noti)
      const notices = await page.evaluate(() => {
        const rows = document.querySelectorAll('tbody tr');
        const notices: any[] = [];

        rows.forEach((row: Element) => {
          const tr = row as HTMLTableRowElement;

          // 고정 공지 제외: tr 혹은 번호 셀에 noti 클래스가 있는 경우 스킵
          if (tr.classList.contains('noti')) return;

          const numberCell = tr.querySelector('td.bdlNum') as HTMLElement | null;
          if (numberCell && numberCell.classList.contains('noti')) return;

          const cells = tr.querySelectorAll('td');
          if (cells.length < 2) return;

          // 번호 텍스트 정제 (숫자만 추출)
          const rawNumber = numberCell?.textContent?.trim() || '';
          const number = rawNumber.replace(/[^0-9]/g, '');

          const titleCell = tr.querySelector('td.bdlTitle a') as HTMLAnchorElement | null;
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

  // 공지사항 목록 크롤링
  async crawlNoticesList(lastKnownNumber: string | null = null): Promise<NoticeResult> {
    try {
      const allNewNotices: Notice[] = [];
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

  // 공지사항 상세 페이지 텍스트 크롤링
  async crawlNoticeDetail(noticeLink: string): Promise<string> {
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
      
      // 공지사항 본문 텍스트 추출 (PKNU 공지사항 페이지 구조)
      const content = await page.evaluate(() => {
        // 본문 영역 선택자 (PKNU 공지사항 페이지 구조에 맞게 조정)
        const contentElement = document.querySelector('.board-view-content') || 
                              document.querySelector('.view-content') ||
                              document.querySelector('article') ||
                              document.body;
        
        if (!contentElement) return '';
        
        // 텍스트만 추출 (스크립트, 스타일 제거)
        const clone = contentElement.cloneNode(true) as HTMLElement;
        const scripts = clone.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        return clone.textContent?.trim() || '';
      });
      
      await context.close();
      return content;
      
    } catch (error) {
      await context.close();
      console.error(`[PKNU] 상세 페이지 크롤링 실패 (${noticeLink}):`, error);
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

