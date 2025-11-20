import { chromium, Browser } from 'playwright';
import { NoticeResult, NoticePreview } from '../types/notice.js';
import { NoticeDetailResult } from './webCrawler.js';

export class KStartupCrawler {
  private browser: Browser | null = null;
  private readonly BASE_URL = 'https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do';

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
      ? this.BASE_URL 
      : `${this.BASE_URL}?pageIndex=${pageIndex}`;
    
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
      
      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(2000);
      
      // 공지사항 목록이 로드될 때까지 대기
      await page.waitForSelector('div.board_list-wrap li.notice', { timeout: 10000 });
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const notices: any[] = [];
        
        try {
          // 공지사항 목록 요소 찾기
          const noticeElements = document.querySelectorAll('div.board_list-wrap li.notice');
          
          if (noticeElements.length === 0) {
            throw new Error('div.board_list-wrap li.notice 요소를 찾을 수 없습니다.');
          }
          
          noticeElements.forEach((element) => {
            try {
              // 제목 추출: div.board_list-wrap > li.notice > p.tit
              const titleElement = element.querySelector('p.tit');
              const title = titleElement?.textContent?.trim() || '';
              
              // 번호 추출: div.board_list-wrap > li.notice > div.left > div.btn_by_bk의 onclick에서
              const btnElement = element.querySelector('div.left div.btn_by_bk');
              const onclickAttr = btnElement?.getAttribute('onclick') || '';
              
              // onclick="javascript:go_view_blank(175574);"에서 숫자 추출
              const numberMatch = onclickAttr.match(/go_view_blank\((\d+)\)/);
              const number = numberMatch ? numberMatch[1] : '';
              
              if (!number || !title) {
                return; // 번호나 제목이 없으면 스킵
              }
              
              // 링크 생성: https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancClssCd=PBC010&schM=view&pbancSn={Number}
              const link = `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancClssCd=PBC010&schM=view&pbancSn=${number}`;
              
              notices.push({
                number: number,
                title: title,
                link: link,
                postedAt: new Date().toISOString().split('T')[0],
                crawledAt: new Date()
              });
            } catch (error) {
              console.error('공지사항 추출 중 오류:', error);
            }
          });
        } catch (error) {
          console.error('[KStartupCrawler] 공지사항 목록 크롤링 실패:', error);
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
      
      console.log(`[KStartupCrawler] 증분 크롤링 시작 (마지막 번호: ${lastKnownNumber || '없음'})`);
      
      // 페이지별로 크롤링
      while (shouldContinue && pageIndex <= 3) { // 최대 3페이지
        console.log(`[KStartupCrawler] 페이지 ${pageIndex} 크롤링 중...`);
        
        const result = await this.crawlPage(pageIndex, lastKnownNumber);
        
        if (result.notices.length > 0) {
          allNewNotices.push(...result.notices);
          console.log(`[KStartupCrawler] 페이지 ${pageIndex}: ${result.notices.length}개 새 공지 발견`);
        }
        
        shouldContinue = result.shouldContinue;
        
        if (shouldContinue) {
          pageIndex++;
          // 페이지 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.log(`[KStartupCrawler] 이전 크롤링 지점 도달 (페이지 ${pageIndex})`);
        }
      }
      
      console.log(`[KStartupCrawler] 크롤링 완료: 총 ${allNewNotices.length}개 새 공지사항 (${pageIndex}페이지 탐색)`);
      
      return {
        url: this.BASE_URL,
        title: 'K-Startup 사업공고',
        timestamp: new Date().toISOString(),
        totalNotices: allNewNotices.length,
        notices: allNewNotices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: 'K-Startup',
          totalCount: allNewNotices.length
        }
      };
      
    } catch (error) {
      console.error(`[KStartupCrawler] 크롤링 실패:`, error);
      throw error;
    }
  }

  // 공지사항 상세 페이지 크롤링 (다음에 구현 예정)
  async crawlNoticeDetail(noticeLink: string): Promise<NoticeDetailResult> {
    // TODO: 상세 페이지 크롤링 로직 구현 예정
    return {
      content: ''
    };
  }

  // 브라우저 종료
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

