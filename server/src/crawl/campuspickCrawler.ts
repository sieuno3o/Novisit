import { chromium, Browser } from 'playwright';
import { NoticeResult, NoticePreview } from '../types/notice.js';
import { NoticeDetailResult } from './webCrawler.js';

export class CampuspickCrawler {
  private browser: Browser | null = null;
  private readonly BASE_URL = 'https://www.campuspick.com/contest?category=108';

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
      : `${this.BASE_URL}&page=${pageIndex}`;
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
      
      // 공지사항 목록이 로드될 때까지 대기 (여러 선택자 시도)
      let itemsFound = false;
      const selectors = [
        'div.list div.item a.top',
        'div.list div.item a',
        'div.list a.top',
        'div.list .item a'
      ];
      
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          const count = await page.$$eval(selector, els => els.length);
          if (count > 0) {
            itemsFound = true;
            console.log(`[CampuspickCrawler] 선택자 발견: ${selector} (${count}개)`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!itemsFound) {
        // 디버깅: 페이지 구조 확인
        const pageStructure = await page.evaluate(() => {
          const listDivs = document.querySelectorAll('div.list');
          return {
            listCount: listDivs.length,
            lists: Array.from(listDivs).map((div, index) => ({
              index: index,
              childrenCount: div.children.length,
              children: Array.from(div.children).slice(0, 3).map(child => ({
                tag: child.tagName,
                className: child.className,
                id: child.id
              }))
            }))
          };
        });
        console.log(`[CampuspickCrawler] 페이지 구조:`, JSON.stringify(pageStructure, null, 2));
        throw new Error('공지사항 목록 요소를 찾을 수 없습니다.');
      }
      
      // 공지사항 데이터 추출
      const notices = await page.evaluate(() => {
        const notices: any[] = [];
        
        try {
          // div#container 안의 모든 div.list를 찾기
          const container = document.querySelector('div#container');
          if (!container) {
            throw new Error('div#container 요소를 찾을 수 없습니다.');
          }
          
          const listDivs = container.querySelectorAll('div.list');
          if (listDivs.length === 0) {
            throw new Error('div#container 안에 div.list 요소를 찾을 수 없습니다.');
          }
          
          // 여러 선택자로 시도
          const selectors = [
            'div.item a.top',
            'div.item a',
            'a.top',
            '.item a'
          ];
          
          // 각 div.list를 반복문으로 처리
          listDivs.forEach((listDiv) => {
            // 각 div.list에서 공지사항 항목 찾기
            for (const selector of selectors) {
              const items = listDiv.querySelectorAll(selector);
              if (items.length > 0) {
                // 각 항목 처리
                items.forEach((item) => {
                  try {
                    // a 요소 찾기 (item이 이미 a일 수도 있음)
                    let linkElement: HTMLAnchorElement | null = null;
                    if (item.tagName === 'A') {
                      linkElement = item as HTMLAnchorElement;
                    } else {
                      linkElement = item.querySelector('a.top') || item.querySelector('a');
                    }
                    
                    if (!linkElement) {
                      return;
                    }
                    
                    // href 속성에서 링크 추출: /contest/view?id=31742
                    const href = linkElement.getAttribute('href') || '';
                    if (!href) {
                      return;
                    }
                    
                    // id 번호 추출: /contest/view?id=31742에서 31742 추출
                    const idMatch = href.match(/[?&]id=(\d+)/);
                    if (!idMatch || !idMatch[1]) {
                      return;
                    }
                    const number = idMatch[1];
                    
                    // 제목 추출: a 요소 밑의 h2 (또는 직접 텍스트)
                    let title = '';
                    const titleElement = linkElement.querySelector('h2');
                    if (titleElement) {
                      title = titleElement.textContent?.trim() || '';
                    } else {
                      // h2가 없으면 a 요소의 직접 텍스트나 다른 하위 요소에서 찾기
                      title = linkElement.textContent?.trim() || '';
                      // 또는 다른 선택자 시도
                      const altTitle = linkElement.querySelector('.title, .tit, h3, h4');
                      if (altTitle) {
                        title = altTitle.textContent?.trim() || title;
                      }
                    }
                    
                    if (!number || !title) {
                      return; // 번호나 제목이 없으면 스킵
                    }
                    
                    // 전체 URL 구성
                    const fullLink = href.startsWith('http') 
                      ? href 
                      : `https://www.campuspick.com${href}`;
                    
                    // 등록일자는 목록 페이지에 없을 수 있으므로 기본값 사용
                    const postedAt = new Date().toISOString().split('T')[0];
                    
                    notices.push({
                      number: number,
                      title: title,
                      link: fullLink,
                      postedAt: postedAt,
                      crawledAt: new Date()
                    });
                  } catch (error) {
                    // 개별 요소 추출 실패는 무시하고 계속 진행
                  }
                });
                
                // 이 선택자로 항목을 찾았으면 다음 div.list로 이동
                if (items.length > 0) {
                  break;
                }
              }
            }
          });
        } catch (error: any) {
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
      
      // shouldContinue 로직:
      // 1. 이전 공지사항을 찾았으면 중단 (foundLastKnown이 true면 false)
      // 2. lastKnownNumber가 없으면 계속 진행
      // 3. 새 공지사항이 있으면 계속 진행
      const shouldContinue = foundLastKnown 
        ? false  // 이전 공지사항을 찾았으면 중단
        : (lastKnownNumber 
            ? newNotices.length > 0  // 이전 번호가 있으면 새 공지가 있으면 계속
            : notices.length > 0);   // 이전 번호가 없으면 공지가 있으면 계속
      
      // 페이지 결과만 출력
      console.log(`[CampuspickCrawler] 페이지 ${pageIndex}: 전체 ${notices.length}개, 새 공지 ${newNotices.length}개${foundLastKnown ? ' (이전 크롤링 지점 도달)' : ''}`);
      
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
  // @param maxPages 최대 크롤링할 페이지 수 (기본값: 1, 무한 스크롤 방식이므로 첫 페이지만)
  async crawlNoticesList(lastKnownNumber: string | null = null, maxPages: number = 1): Promise<NoticeResult> {
    try {
      const allNewNotices: NoticePreview[] = [];
      let pageIndex = 1;
      let shouldContinue = true;
      
      console.log(`[CampuspickCrawler] 증분 크롤링 시작 (마지막 번호: ${lastKnownNumber || '없음'}, 최대 페이지: ${maxPages})`);
      
      // 페이지별로 크롤링 (최대 maxPages 페이지)
      while (shouldContinue && pageIndex <= maxPages) {
        console.log(`[CampuspickCrawler] 페이지 ${pageIndex} 크롤링 중...`);
        
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
            console.log(`[CampuspickCrawler] 최대 페이지(${maxPages}) 도달. 크롤링 종료.`);
          }
          break;
        }
      }
      
      console.log(`[CampuspickCrawler] 크롤링 완료: 총 ${allNewNotices.length}개 새 공지사항 (${pageIndex}페이지 탐색)`);
      
      return {
        url: this.BASE_URL,
        title: '캠퍼스픽 공모전',
        timestamp: new Date().toISOString(),
        totalNotices: allNewNotices.length,
        notices: allNewNotices,
        summary: {
          extractedAt: new Date().toISOString(),
          source: 'CAMPUSPICK',
          totalCount: allNewNotices.length
        }
      };
      
    } catch (error) {
      console.error(`[CampuspickCrawler] 크롤링 실패:`, error);
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
          await page.goto(noticeLink, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000
          });
          
          // 페이지가 완전히 로드될 때까지 대기
          await page.waitForTimeout(3000);
          
          // 본문이 로드될 때까지 대기 (여러 선택자 시도)
          let descriptionFound = false;
          const descriptionSelectors = [
            'div.container article.description',
            'article.description',
            'div.container .description',
            '.description',
            'div.container article',
            'article'
          ];
          
          for (const selector of descriptionSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 5000 });
              const exists = await page.$(selector);
              if (exists) {
                descriptionFound = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!descriptionFound) {
            // 디버깅: 페이지 구조 확인
            const pageStructure = await page.evaluate(() => {
              const container = document.querySelector('div.container');
              return {
                containerExists: !!container,
                containerChildren: container ? Array.from(container.children).slice(0, 5).map(child => ({
                  tag: child.tagName,
                  className: child.className,
                  id: child.id
                })) : [],
                articles: Array.from(document.querySelectorAll('article')).map(art => ({
                  className: art.className,
                  id: art.id
                }))
              };
            });
            console.log(`[CampuspickCrawler] 페이지 구조:`, JSON.stringify(pageStructure, null, 2));
            throw new Error('본문 요소를 찾을 수 없습니다.');
          }
          
          // 성공하면 재시도 루프 종료
          break;
        } catch (error: any) {
          lastError = error;
          retryCount++;
          
          if (retryCount <= maxRetries) {
            console.warn(`[CampuspickCrawler] 상세 페이지 로드 실패 (재시도 ${retryCount}/${maxRetries}): ${noticeLink}`);
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
      
      // 공지사항 본문 텍스트 및 이미지 추출
      const result = await page.evaluate(() => {
        // 여러 선택자로 본문 찾기
        const descriptionSelectors = [
          'div.container article.description',
          'article.description',
          'div.container .description',
          '.description',
          'div.container article',
          'article'
        ];
        
        let descriptionElement: Element | null = null;
        for (const selector of descriptionSelectors) {
          descriptionElement = document.querySelector(selector);
          if (descriptionElement) break;
        }
        
        const content = descriptionElement?.textContent?.trim() || '';
        
        // 이미지 추출: div.poster img의 src 속성
        const posterElement = document.querySelector('div.poster img');
        const imageUrl = posterElement?.getAttribute('src') || undefined;
        
        // 이미지 URL이 상대 경로인 경우 절대 경로로 변환
        let fullImageUrl = imageUrl;
        if (imageUrl && !imageUrl.startsWith('http')) {
          fullImageUrl = imageUrl.startsWith('/') 
            ? `https://www.campuspick.com${imageUrl}`
            : `https://www.campuspick.com/${imageUrl}`;
        }
        
        return { 
          content: content,
          imageUrl: fullImageUrl
        };
      });
      
      await context.close();
      
      const detailResult: NoticeDetailResult = {
        content: result.content
      };
      
      if (result.imageUrl) {
        detailResult.imageUrl = result.imageUrl;
      }
      
      return detailResult;
      
    } catch (error) {
      await context.close();
      console.error(`[CampuspickCrawler] 상세 페이지 크롤링 실패 (${noticeLink}):`, error);
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
