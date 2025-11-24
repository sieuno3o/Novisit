import { chromium, Browser } from 'playwright';
import { NoticeResult, NoticePreview } from '../types/notice.js';
import { NoticeDetailResult } from './webCrawler.js';

export class MSSCrawler {
  private browser: Browser | null = null;
  private readonly BASE_URL = 'https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310';

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
    const browser = await this.initBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      // 첫 페이지로 이동
      await page.goto(this.BASE_URL, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // 페이지가 완전히 로드될 때까지 대기
      await page.waitForTimeout(2000);
      
      // 2페이지 이상인 경우 페이지 링크 클릭
      if (pageIndex > 1) {
        // 페이지네이션 요소 찾기 (여러 선택자 시도)
        let pageLinksFound = false;
        let foundSelector = '';
        
        // 먼저 페이지네이션 영역이 있는지 확인
        const paginationExists = await page.evaluate(() => {
          return !!document.querySelector('.pagination') || 
                 !!document.querySelector('div.pagination') ||
                 !!document.querySelector('w-page');
        });
        
        if (!paginationExists) {
          console.log(`[MSSCrawler] 페이지 ${pageIndex}: 페이지네이션 영역을 찾을 수 없습니다. 크롤링 종료.`);
          await context.close();
          return {
            notices: [],
            shouldContinue: false
          };
        }
        
        // 여러 선택자로 페이지 링크 찾기
        const selectors = [
          'div.pagination w-page div.page-links div.page-link',
          'w-page div.page-links div.page-link',
          'div.pagination div.page-links div.page-link',
          'div.pagination div.page-link',
          '.pagination .page-link',
          '.page-links .page-link',
          'div.page-link'
        ];
        
        for (const selector of selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            const count = await page.$$eval(selector, (els) => els.length);
            if (count > 0) {
              pageLinksFound = true;
              foundSelector = selector;
              console.log(`[MSSCrawler] 페이지네이션 요소 발견: ${selector} (${count}개)`);
              break;
            }
          } catch (e) {
            // 다음 선택자 시도
            continue;
          }
        }
        
        if (!pageLinksFound) {
          // 페이지네이션 요소를 찾을 수 없으면 빈 결과 반환
          console.log(`[MSSCrawler] 페이지 ${pageIndex}: 페이지네이션 링크를 찾을 수 없습니다. 크롤링 종료.`);
          await context.close();
          return {
            notices: [],
            shouldContinue: false
          };
        }
        
        // 해당 페이지 번호를 가진 링크 찾아서 클릭
        const clicked = await page.evaluate(
          ({ targetPageIndex, selector }: { targetPageIndex: number; selector: string }) => {
            const pageLinks = document.querySelectorAll(selector);
            if (pageLinks.length === 0) {
              return false;
            }
            
            for (const link of Array.from(pageLinks)) {
              const text = link.textContent?.trim() || '';
              const pageNum = parseInt(text);
              if (pageNum === targetPageIndex) {
                (link as HTMLElement).click();
                return true;
              }
            }
            return false;
          },
          { targetPageIndex: pageIndex, selector: foundSelector }
        );
        
        if (!clicked) {
          // 페이지가 없으면 빈 결과 반환
          console.log(`[MSSCrawler] 페이지 ${pageIndex}: 해당 페이지 번호(${pageIndex})를 찾을 수 없습니다. 크롤링 종료.`);
          await context.close();
          return {
            notices: [],
            shouldContinue: false
          };
        }
        
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');
      }
      
      // 공지사항 목록이 로드될 때까지 대기
      await page.waitForSelector('tbody tr', { timeout: 10000 });
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const notices: any[] = [];
        
        try {
          // tbody tr 요소들 찾기
          const rows = document.querySelectorAll('tbody tr');
          
          if (rows.length === 0) {
            throw new Error('tbody tr 요소를 찾을 수 없습니다.');
          }
          
          rows.forEach((row) => {
            try {
              // 빈 행 체크: row가 실제로 데이터를 가지고 있는지 확인
              if (!row || !row.querySelector) {
                return; // 유효하지 않은 행은 스킵
              }
              
              // 제목 추출: tr의 title attribute
              const title = row.getAttribute('title')?.trim() || '';
              
              // td 요소들 찾기
              const cells = row.querySelectorAll('td');
              
              // 최소한의 셀 개수 확인 (번호, 제목, 작성자, 날짜 등이 있어야 함)
              if (cells.length < 4) {
                return; // 셀이 부족하면 스킵
              }
              
              // 번호 추출: 첫 번째 td
              const numberCell = cells[0];
              const number = numberCell?.textContent?.trim() || '';
              
              // 번호와 제목이 모두 있어야 함
              if (!number || !title || number === '' || title === '') {
                return; // 번호나 제목이 없으면 스킵
              }
              
              // 등록일자 추출: 4번째 td (인덱스 3)
              const dateCell = cells[3];
              let postedAt = new Date().toISOString().split('T')[0]; // 기본값: 오늘 날짜
              if (dateCell) {
                const dateText = dateCell.textContent?.trim() || '';
                // 2025.11.17 형식을 2025-11-17로 변환
                const dateMatch = dateText.match(/(\d{4})\.(\d{2})\.(\d{2})/);
                if (dateMatch) {
                  postedAt = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                }
              }
              
              // 링크 추출: tr의 onclick에서 doBbsFView 함수의 두 번째 인자 추출
              let link = '';
              const onclickAttr = row.getAttribute('onclick');
              if (onclickAttr) {
                // doBbsFView('310','1063291','16010100','1063291') 형식에서 두 번째 인자 추출
                const doBbsFViewMatch = onclickAttr.match(/doBbsFView\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
                if (doBbsFViewMatch && doBbsFViewMatch[1] && doBbsFViewMatch[2]) {
                  const cbIdx = doBbsFViewMatch[1]; // 첫 번째 인자
                  const bcIdx = doBbsFViewMatch[2]; // 두 번째 인자
                  // URL 구성: https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=310&bcIdx=1063291&parentSeq=1063291
                  link = `https://www.mss.go.kr/site/smba/ex/bbs/View.do?cbIdx=${cbIdx}&bcIdx=${bcIdx}&parentSeq=${bcIdx}`;
                } else {
                  // doBbsFView 형식이 아니면 기존 방식으로 시도
                  const urlMatch = onclickAttr.match(/['"]([^'"]+)['"]/);
                  if (urlMatch && urlMatch[1]) {
                    link = urlMatch[1].startsWith('http') 
                      ? urlMatch[1] 
                      : `https://www.mss.go.kr${urlMatch[1]}`;
                  }
                }
              } else {
                // a 태그에서 링크 추출
                const linkElement = row.querySelector('a');
                if (linkElement) {
                  const href = linkElement.getAttribute('href') || '';
                  link = href.startsWith('http') 
                    ? href 
                    : `https://www.mss.go.kr${href}`;
                }
              }
              
              // 최종 검증: number와 title이 유효한 값인지 확인
              if (!number || !title || number === '' || title === '' || number === 'undefined' || title === 'undefined') {
                return; // 유효하지 않은 값은 스킵
              }
              
              notices.push({
                number: number,
                title: title,
                link: link || 'https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310',
                postedAt: postedAt,
                crawledAt: new Date()
              });
            } catch (error) {
              // 개별 요소 추출 실패는 무시하고 계속 진행
              console.warn('[MSSCrawler] 행 처리 중 오류 (스킵):', error);
            }
          });
        } catch (error: any) {
          throw error;
        }
        
        // undefined나 빈 값이 있는 항목 제거
        const validNotices = notices.filter(notice => 
          notice && 
          notice.number && 
          notice.title && 
          notice.number !== '' && 
          notice.title !== '' &&
          notice.number !== 'undefined' &&
          notice.title !== 'undefined'
        );
        
        return validNotices;
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
      
      // shouldContinue 로직:
      // 1. 이전 공지사항을 찾았으면 중단 (foundLastKnown이 true면 false)
      // 2. lastKnownNumber가 없으면 계속 진행 (단, 최대 페이지 제한은 상위에서 처리)
      // 3. 새 공지사항이 있으면 계속 진행
      const shouldContinue = foundLastKnown 
        ? false  // 이전 공지사항을 찾았으면 중단
        : (lastKnownNumber 
            ? newNotices.length > 0  // 이전 번호가 있으면 새 공지가 있으면 계속
            : notices.length > 0);   // 이전 번호가 없으면 공지가 있으면 계속
      
      // 페이지 결과만 출력
      console.log(`[MSSCrawler] 페이지 ${pageIndex}: 전체 ${notices.length}개, 새 공지 ${newNotices.length}개${foundLastKnown ? ' (이전 크롤링 지점 도달)' : ''}`);
      
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
  // @param lastKnownNumber 마지막으로 알려진 공지사항 번호 (증분 크롤링용)
  // @param maxPages 최대 크롤링할 페이지 수 (기본값: 3)
  async crawlNoticesList(lastKnownNumber: string | null = null, maxPages: number = 3): Promise<NoticeResult> {
    try {
      const allNewNotices: NoticePreview[] = [];
      let pageIndex = 1;
      let shouldContinue = true;
      
      console.log(`[MSSCrawler] 증분 크롤링 시작 (마지막 번호: ${lastKnownNumber || '없음'}, 최대 페이지: ${maxPages})`);
      
      // 페이지별로 크롤링 (최대 maxPages 페이지)
      while (shouldContinue && pageIndex <= maxPages) {
        console.log(`[MSSCrawler] 페이지 ${pageIndex} 크롤링 중...`);
        
        const result = await this.crawlPage(pageIndex, lastKnownNumber);
        
        if (result.notices.length > 0) {
          allNewNotices.push(...result.notices);
        }
        
        // 이전 크롤링 지점에 도달했거나 더 이상 새 공지가 없으면 중단
        shouldContinue = result.shouldContinue;
        
        if (shouldContinue && pageIndex < maxPages) {
          pageIndex++;
          // 페이지 간 딜레이 (서버 부하 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          // 최대 페이지 도달 또는 중단 조건 만족
          if (pageIndex >= maxPages) {
            console.log(`[MSSCrawler] 최대 페이지(${maxPages}) 도달. 크롤링 종료.`);
          }
          break;
        }
      }
      
      console.log(`[MSSCrawler] 크롤링 완료: 총 ${allNewNotices.length}개 새 공지사항 (${pageIndex}페이지 탐색)`);
      
      return {
        url: this.BASE_URL,
        title: '중소벤처기업부 사업공고',
        timestamp: new Date().toISOString(),
        totalNotices: allNewNotices.length,
        notices: allNewNotices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: 'MSS',
          totalCount: allNewNotices.length
        }
      };
      
    } catch (error) {
      console.error(`[MSSCrawler] 크롤링 실패:`, error);
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
          
          // iframe이 로드될 때까지 대기
          await page.waitForSelector('iframe.iframeRes', { 
            timeout: 15000 
          });
          
          // 성공하면 재시도 루프 종료
          break;
        } catch (error: any) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.warn(`[MSSCrawler] 상세 페이지 로드 실패 (재시도 ${retryCount}/${maxRetries}): ${noticeLink}`);
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
      
      // 공지사항 본문 텍스트 추출
      const result = await page.evaluate(() => {
        const contentParts: string[] = [];
        
        // tr.web의 두 번째 th, td 추출
        const webRows = document.querySelectorAll('tr.web');
        webRows.forEach((row) => {
          const thElements = row.querySelectorAll('th');
          const tdElements = row.querySelectorAll('td');
          
          // 두 번째 th 추출
          if (thElements.length >= 2 && thElements[1]) {
            const text = thElements[1].textContent?.trim() || '';
            if (text) {
              contentParts.push(text);
            }
          }
          
          // 두 번째 td 추출
          if (tdElements.length >= 2 && tdElements[1]) {
            const text = tdElements[1].textContent?.trim() || '';
            if (text) {
              contentParts.push(text);
            }
          }
        });
        
        // iframe.iframeRes의 내용 추출
        const iframe = document.querySelector('iframe.iframeRes') as HTMLIFrameElement;
        if (iframe) {
          try {
            // iframe의 contentDocument에 접근 시도
            if (iframe.contentDocument) {
              const editorContent = iframe.contentDocument.querySelector('div.editorContentIframe');
              if (editorContent) {
                // script 태그 제거
                const scripts = editorContent.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                // 텍스트 추출
                const iframeContent = editorContent.textContent?.trim() || '';
                if (iframeContent) {
                  contentParts.push(iframeContent);
                }
              }
            } else if (iframe.contentWindow) {
              // contentWindow를 통한 접근 시도
              const editorContent = iframe.contentWindow.document?.querySelector('div.editorContentIframe');
              if (editorContent) {
                // script 태그 제거
                const scripts = editorContent.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                // 텍스트 추출
                const iframeContent = editorContent.textContent?.trim() || '';
                if (iframeContent) {
                  contentParts.push(iframeContent);
                }
              }
            }
          } catch (e) {
            // Cross-origin 제한으로 인한 접근 실패는 무시
            console.warn('iframe 접근 실패:', e);
          }
        }
        
        // 모든 내용을 줄바꿈으로 연결
        const content = contentParts.join('\n\n').trim();
        
        return { content: content };
      });
      
      // iframe이 있고 contentDocument 접근이 실패한 경우, iframe의 src로 직접 접근 시도
      if (!result.content || result.content.length < 100) {
        const iframeSrc = await page.evaluate(() => {
          const iframe = document.querySelector('iframe.iframeRes') as HTMLIFrameElement;
          return iframe ? iframe.src : null;
        });
        
        if (iframeSrc) {
          try {
            const iframePage = await context.newPage();
            await iframePage.goto(iframeSrc, { 
              waitUntil: 'domcontentloaded',
              timeout: 30000
            });
            await iframePage.waitForTimeout(2000);
            
            const iframeContent = await iframePage.evaluate(() => {
              const editorContent = document.querySelector('div.editorContentIframe');
              if (editorContent) {
                // script 태그 제거
                const scripts = editorContent.querySelectorAll('script');
                scripts.forEach(script => script.remove());
                // 텍스트 추출
                return editorContent.textContent?.trim() || '';
              }
              return '';
            });
            
            if (iframeContent) {
              result.content = result.content 
                ? `${result.content}\n\n${iframeContent}` 
                : iframeContent;
            }
            
            await iframePage.close();
          } catch (e) {
            // iframe 직접 접근 실패는 무시
            console.warn(`[MSSCrawler] iframe 직접 접근 실패: ${iframeSrc}`, e);
          }
        }
      }
      
      await context.close();
      
      // 이미지는 없으므로 imageUrl은 반환하지 않음 (기본 이미지 사용)
      return { content: result.content };
      
    } catch (error) {
      await context.close();
      console.error(`[MSSCrawler] 상세 페이지 크롤링 실패 (${noticeLink}):`, error);
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

