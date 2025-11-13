import { chromium, Browser } from 'playwright';
import { NoticeResult, NoticePreview } from '../types/crawl.js';
import { NoticeDetailResult } from './webCrawler.js';

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
  private async crawlPage(pageIndex: number, lastKnownNumber: string | null): Promise<{ notices: NoticePreview[], shouldContinue: boolean }> {
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

          // 고정 공지 제외: tr에 noti 클래스가 있는 경우 스킵
          // (일반 공지사항도 td.bdlNum에 noti 클래스가 있을 수 있으므로, tr의 noti만 확인)
          if (tr.classList.contains('noti')) return;

          const numberCell = tr.querySelector('td.bdlNum') as HTMLElement | null;
          const cells = tr.querySelectorAll('td');
          if (cells.length < 2) return;

          // 번호 텍스트 정제 (숫자만 추출)
          const rawNumber = numberCell?.textContent?.trim() || '';
          const number = rawNumber.replace(/[^0-9]/g, '');
          
          // 번호가 없거나 "NOTICE" 같은 텍스트인 경우 스킵
          if (!number || number.length === 0) return;

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
      const allNewNotices: NoticePreview[] = [];
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

  // 공지사항 상세 페이지 텍스트 및 이미지 크롤링
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
      
      // 공지사항 본문 텍스트 및 첫 번째 이미지 URL 추출
      const result = await page.evaluate(() => {
        // div.bdvTxt 영역만 크롤링
        const contentElement = document.querySelector('div.bdvTxt');
        
        if (!contentElement) {
          return { content: '', imageUrl: undefined };
        }
        
        // p 태그들을 순서대로 처리
        const paragraphs = contentElement.querySelectorAll('p');
        const textParts: string[] = [];
        let imageUrl: string | undefined = undefined;
        
        // 각 p 태그를 순회하면서 텍스트와 이미지 추출
        for (const p of Array.from(paragraphs)) {
          // p 태그 내부의 텍스트 추출 (스크립트, 스타일 제거)
          const clone = p.cloneNode(true) as HTMLElement;
          const scripts = clone.querySelectorAll('script, style');
          scripts.forEach(el => el.remove());
          
          const text = clone.textContent?.trim() || '';
          if (text) {
            textParts.push(text);
          }
          
          // 첫 번째 이미지를 아직 찾지 못했다면 p 태그 내부에서 이미지 찾기
          if (!imageUrl) {
            const img = p.querySelector('img');
            if (img) {
              const src = img.getAttribute('src') || '';
              if (src) {
                // 상대 경로인 경우 절대 경로로 변환
                if (src.startsWith('http')) {
                  imageUrl = src;
                } else if (src.startsWith('//')) {
                  imageUrl = `https:${src}`;
                } else if (src.startsWith('/')) {
                  imageUrl = `https://www.pknu.ac.kr${src}`;
                } else {
                  // 상대 경로인 경우
                  const baseUrl = window.location.origin;
                  imageUrl = new URL(src, baseUrl).href;
                }
              }
            }
          }
        }
        
        // p 태그가 없는 경우 전체 텍스트 추출 (fallback)
        const content = textParts.length > 0 
          ? textParts.join('\n\n')
          : (() => {
              const clone = contentElement.cloneNode(true) as HTMLElement;
              const scripts = clone.querySelectorAll('script, style');
              scripts.forEach(el => el.remove());
              return clone.textContent?.trim() || '';
            })();
        
        // p 태그에서 이미지를 찾지 못한 경우 전체에서 찾기 (fallback)
        if (!imageUrl) {
          const images = contentElement.querySelectorAll('img');
          for (const img of Array.from(images)) {
            const src = img.getAttribute('src') || '';
            if (src) {
              // 상대 경로인 경우 절대 경로로 변환
              if (src.startsWith('http')) {
                imageUrl = src;
              } else if (src.startsWith('//')) {
                imageUrl = `https:${src}`;
              } else if (src.startsWith('/')) {
                imageUrl = `https://www.pknu.ac.kr${src}`;
              } else {
                // 상대 경로인 경우
                const baseUrl = window.location.origin;
                imageUrl = new URL(src, baseUrl).href;
              }
              break;
            }
          }
        }
        
        return { content, imageUrl: imageUrl || undefined };
      });
      
      await context.close();
      // imageUrl이 없으면 속성 제거
      const finalResult: NoticeDetailResult = result.imageUrl 
        ? { content: result.content, imageUrl: result.imageUrl }
        : { content: result.content };
      return finalResult;
      
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

