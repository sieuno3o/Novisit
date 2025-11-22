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
      ? `${this.BASE_URL}?pbancClssCd=PBC010`
      : `${this.BASE_URL}?page=${pageIndex}&pbancClssCd=PBC010`;
    
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
      const result = await page.evaluate(() => {
        const notices: any[] = [];
        const debugInfo: any = {
          noticeElementsCount: 0
        };
        
        try {
          // 공지사항 목록 요소 찾기
          const noticeElements = document.querySelectorAll('div.board_list-wrap li.notice');
          debugInfo.noticeElementsCount = noticeElements.length;
          
          if (noticeElements.length === 0) {
            throw new Error('div.board_list-wrap li.notice 요소를 찾을 수 없습니다.');
          }
          
          noticeElements.forEach((element) => {
            try {
              // 제목 추출: div.board_list-wrap > li.notice > p.tit
              const titleElement = element.querySelector('p.tit');
              const title = titleElement?.textContent?.trim() || '';
              
              // 번호 추출: 여러 방법 시도
              let number = '';
              
              // 방법 1: li 요소의 data 속성 확인
              const liElement = element as HTMLElement;
              const dataSn = liElement.getAttribute('data-pbanc-sn') || 
                             liElement.getAttribute('data-sn') ||
                             liElement.dataset.pbancSn ||
                             liElement.dataset.sn ||
                             '';
              if (dataSn) {
                number = dataSn;
              }
              
              // 방법 2: 다른 버튼 요소들 확인
              if (!number) {
                const allButtons = element.querySelectorAll('[onclick*="go_view"], [onclick*="view"], [onclick*="pbancSn"], button, a');
                for (const btn of Array.from(allButtons)) {
                  const onclick = btn.getAttribute('onclick') || '';
                  if (onclick) {
                    const match = onclick.match(/go_view_blank\((\d+)\)|view\((\d+)\)|pbancSn[=:](\d+)/);
                    if (match) {
                      number = match[1] || match[2] || match[3] || '';
                      if (number) {
                        break;
                      }
                    }
                  }
                }
              }
              
              // 방법 3: 링크에서 번호 추출 (fallback)
              if (!number) {
                const linkElement = element.querySelector('a[href*="pbancSn"]') as HTMLAnchorElement;
                if (linkElement) {
                  const href = linkElement.getAttribute('href') || '';
                  const hrefMatch = href.match(/pbancSn=(\d+)/);
                  if (hrefMatch && hrefMatch[1]) {
                    number = hrefMatch[1];
                  }
                }
              }
              
              if (!number || !title) {
                return; // 번호나 제목이 없으면 스킵
              }
              
              // 등록일자 추출: div.bottom span.list 중 3번째에서 i 태그 안의 "등록일자 2025-11-20" 형식
              let postedAt = new Date().toISOString().split('T')[0]; // 기본값: 오늘 날짜
              
              // 방법 1: div.bottom span.list 중 3번째에서 추출
              const bottomElement = element.querySelector('div.bottom');
              if (bottomElement) {
                const spanLists = bottomElement.querySelectorAll('span.list');
                if (spanLists.length >= 3 && spanLists[2]) {
                  const thirdSpan = spanLists[2];
                  const iElement = thirdSpan.querySelector('i');
                  const text = iElement ? iElement.textContent?.trim() : thirdSpan.textContent?.trim() || '';
                  const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
                  if (dateMatch && dateMatch[1]) {
                    postedAt = dateMatch[1];
                  }
                }
              }
              
              // 방법 2: 모든 span.list에서 "등록일자"가 포함된 것 찾기
              if (postedAt === new Date().toISOString().split('T')[0]) {
                const allBottomElements = element.querySelectorAll('div.bottom');
                for (const bottom of Array.from(allBottomElements)) {
                  const spanLists = bottom.querySelectorAll('span.list');
                  for (const span of Array.from(spanLists)) {
                    const iElement = span.querySelector('i');
                    const text = iElement ? iElement.textContent?.trim() : span.textContent?.trim() || '';
                    if (text.includes('등록일자')) {
                      const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
                      if (dateMatch && dateMatch[1]) {
                        postedAt = dateMatch[1];
                        break;
                      }
                    }
                  }
                  if (postedAt !== new Date().toISOString().split('T')[0]) break;
                }
              }
              
              // 방법 3: 전체 element에서 날짜 패턴 찾기 (최후의 수단)
              if (postedAt === new Date().toISOString().split('T')[0]) {
                const allText = element.textContent || '';
                // "등록일자" 키워드 주변에서 날짜 찾기
                const regDateMatch = allText.match(/등록일자\s*(\d{4}-\d{2}-\d{2})/);
                if (regDateMatch && regDateMatch[1]) {
                  postedAt = regDateMatch[1];
                } else {
                  // 등록일자 키워드 없이 날짜 패턴만 찾기 (div.bottom 영역 내에서만)
                  const bottomText = bottomElement ? bottomElement.textContent || '' : '';
                  const dateMatches = bottomText.match(/(\d{4}-\d{2}-\d{2})/g);
                  if (dateMatches && dateMatches.length > 0) {
                    // 여러 날짜가 있으면 첫 번째 것 사용 (보통 등록일자가 첫 번째)
                    postedAt = dateMatches[0];
                  }
                }
              }
              
              // 링크 생성: https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancClssCd=PBC010&schM=view&pbancSn={Number}
              const link = `https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancClssCd=PBC010&schM=view&pbancSn=${number}`;
              
              notices.push({
                number: number,
                title: title,
                link: link,
                postedAt: postedAt,
                crawledAt: new Date()
              });
            } catch (error) {
              // 개별 요소 추출 실패는 무시하고 계속 진행
            }
          });
        } catch (error: any) {
          throw error;
        }
        
        return { notices, debugInfo };
      });
      
      const notices = result.notices;
      
      await context.close();
      
      // 이전 크롤링 번호를 찾았는지 확인
      const foundLastKnown = lastKnownNumber 
        ? notices.some(n => n.number === lastKnownNumber)
        : false;
      
      // 필터링: 이전 번호보다 큰 것만
      const newNotices = lastKnownNumber
        ? notices.filter(n => parseInt(n.number) > parseInt(lastKnownNumber))
        : notices;
      
      // shouldContinue 로직: lastKnownNumber가 없으면 계속 진행, 있으면 foundLastKnown이 false이고 notices가 있으면 계속
      const shouldContinue = lastKnownNumber 
        ? !foundLastKnown && notices.length > 0
        : notices.length > 0; // lastKnownNumber가 없으면 notices가 있으면 계속 진행
      
      // 페이지 결과만 출력
      console.log(`[KStartupCrawler] 페이지 ${pageIndex}: 전체 ${notices.length}개, 새 공지 ${newNotices.length}개`);
      
      // 추출 실패 시에만 경고 출력
      if (notices.length === 0 && result.debugInfo.noticeElementsCount > 0) {
        console.warn(`[KStartupCrawler] 경고: ${result.debugInfo.noticeElementsCount}개 요소를 찾았지만 추출된 공지사항이 0개입니다.`);
      }
      
      return {
        notices: newNotices,
        shouldContinue: shouldContinue
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
        }
        
        shouldContinue = result.shouldContinue;
        
        if (shouldContinue) {
          pageIndex++;
          // 페이지 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
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

  // 공지사항 상세 페이지 크롤링
  async crawlNoticeDetail(noticeLink: string): Promise<NoticeDetailResult> {
    const browser = await this.initBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    let page = await context.newPage();
    
    try {
      // 재시도 로직 (최대 2번 재시도)
      let retryCount = 0;
      const maxRetries = 2;
      let lastError: Error | null = null;
      
      while (retryCount <= maxRetries) {
        try {
          // domcontentloaded로 변경 (더 관대한 옵션)
          await page.goto(noticeLink, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 // 타임아웃을 60초로 증가
          });
          
          // 페이지가 완전히 로드될 때까지 대기
          await page.waitForTimeout(3000);
          
          // information_list-wrap이 로드될 때까지 대기
          await page.waitForSelector('div.information_list-wrap', { 
            timeout: 15000 
          });
          
          // 성공하면 재시도 루프 종료
          break;
        } catch (error: any) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.warn(`[KStartupCrawler] 상세 페이지 로드 실패 (재시도 ${retryCount}/${maxRetries}): ${noticeLink}`);
            // 재시도 전 대기
            await new Promise(resolve => setTimeout(resolve, 2000));
            // 새 페이지 생성
            await page.close();
            page = await context.newPage();
          }
        }
      }
      
      // 모든 재시도 실패 시 에러 던지기
      if (lastError && retryCount > maxRetries) {
        throw lastError;
      }
      
      // 공지사항 본문 텍스트 추출 (구조화된 방식)
      const result = await page.evaluate(() => {
        // div.information_list-wrap 요소 찾기
        const wrapElement = document.querySelector('div.information_list-wrap');
        
        if (!wrapElement) {
          return { content: '' };
        }
        
        // div.information_list 요소들을 모두 찾기
        const informationListElements = wrapElement.querySelectorAll('div.information_list');
        
        if (informationListElements.length === 0) {
          return { content: '' };
        }
        
        // 각 information_list의 내용을 구조화하여 추출
        const contentParts: string[] = [];
        
        informationListElements.forEach((element) => {
          const sectionParts: string[] = [];
          
          // 1. p.title 추출 (제목)
          const titleElement = element.querySelector('p.title');
          if (titleElement) {
            const title = titleElement.textContent?.trim() || '';
            if (title) {
              sectionParts.push(title);
            }
          }
          
          // 2. li.dot_list 요소들 추출
          const dotListElements = element.querySelectorAll('li.dot_list');
          dotListElements.forEach((liElement) => {
            const itemParts: string[] = [];
            
            // p.tit (소제목) 추출
            const titElement = liElement.querySelector('p.tit');
            if (titElement) {
              let tit = titElement.textContent || '';
              // 공백 정리: 연속된 공백/탭을 하나로, 줄바꿈 제거
              tit = tit.replace(/\s+/g, ' ').trim();
              if (tit) {
                itemParts.push(tit);
              }
            }
            
            // p.list 또는 p.txt (내용) 추출
            const listElement = liElement.querySelector('p.list');
            const txtElement = liElement.querySelector('p.txt');
            
            // p.list가 있으면 우선 사용, 없으면 p.txt 사용
            const contentElement = listElement || txtElement;
            if (contentElement) {
              let content = contentElement.textContent || '';
              // 공백 정리: 연속된 공백/탭을 하나로, 줄바꿈은 공백으로 변환
              content = content.replace(/\s+/g, ' ').trim();
              if (content) {
                itemParts.push(content);
              }
            }
            
            // 소제목과 내용이 있으면 추가
            if (itemParts.length > 0) {
              sectionParts.push(itemParts.join('\n'));
            }
          });
          
          // 섹션 내용이 있으면 추가
          if (sectionParts.length > 0) {
            contentParts.push(sectionParts.join('\n\n'));
          }
        });
        
        // 모든 내용을 줄바꿈으로 연결
        const content = contentParts.join('\n\n').trim();
        
        return { content: content };
      });
      
      await context.close();
      
      // 이미지는 없으므로 imageUrl은 반환하지 않음 (기본 이미지 사용)
      return { content: result.content };
      
    } catch (error) {
      await context.close();
      console.error(`[KStartupCrawler] 상세 페이지 크롤링 실패 (${noticeLink}):`, error);
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

