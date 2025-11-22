<<<<<<< HEAD
import { WebCrawler } from "../crawl/webCrawler.js";
import { KeywordDomainPair } from "../types/job.js";
import { NoticePreview, NoticeResult } from "../types/notice.js";
import {
  saveNotices,
  getLatestNoticeNumber,
} from "../repository/mongodb/noticeRepository.js";
import { findDomainById } from "../repository/mongodb/domainRepository.js";
import {
  getSettingsByIds,
  saveMessage,
} from "../repository/mongodb/settingsRepository.js";
import { sendKakaoMessage } from "./notificationService.js";
import { getSummaryFromText } from "./openAIService.js";
import { getSourceFromUrl, extractDomainName } from "../utils/urlUtils.js";
import { formatCrawlDate } from "../utils/dateUtils.js";
import { routeMessageByPlatform } from "./platformRouter.js";
import Setting from "@/models/Setting.js";
=======
import { WebCrawler } from '../crawl/webCrawler.js';
import { KeywordDomainPair } from '../types/job.js';
import { NoticePreview, NoticeResult } from '../types/notice.js';
import { saveNotices, getLatestNoticeNumber } from '../repository/mongodb/noticeRepository.js';
import { findDomainById } from '../repository/mongodb/domainRepository.js';
import { getSettingsByIds, saveMessage } from '../repository/mongodb/settingsRepository.js';
import { sendKakaoMessage } from './notificationService.js';
import { getSourceFromUrl } from '../utils/urlUtils.js';
import { formatCrawlDate } from '../utils/dateUtils.js';
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1

// 키워드 필터링 함수
export function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return true; // 키워드가 없으면 모든 공지 통과
<<<<<<< HEAD
  return keywords.some((keyword) => text.includes(keyword));
=======
  return keywords.some(keyword => text.includes(keyword));
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
}

/**
 * 하나의 URL에 대해 공지사항 목록 크롤링 후 키워드 매칭, 상세 페이지 크롤링 및 알림 전송
 * @param url 크롤링할 URL
 * @param keywordDomainPairs 키워드와 도메인ID 쌍 배열
 * @param crawler WebCrawler 인스턴스
<<<<<<< HEAD
 * @returns 처리된 공지사항 수와 크롤링 결과
=======
 * @returns 처리된 공지사항 수
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
 */
export async function crawlAndFilterByKeywords(
  url: string,
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler
<<<<<<< HEAD
): Promise<{ notificationsSent: number; crawlResult: NoticeResult }> {
  let totalProcessed = 0;
  let crawlResult: NoticeResult | null = null;
=======
): Promise<number> {
  let totalProcessed = 0;
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
  
  try {
    // URL에서 소스 이름 추출 (PKNU, NAVER 등)
    const source = getSourceFromUrl(url);
<<<<<<< HEAD

    // 크롤링 날짜 생성 (yymmdd-hh 형식)
    const crawlDate = formatCrawlDate();

    // 크롤링은 한 번만 수행 (같은 URL이므로)
    const lastKnownNumber = await getLatestNoticeNumber(url, source);
    
    // campuspick은 무한 스크롤 방식이므로 1페이지, 다른 크롤러는 3페이지
    const domainName = extractDomainName(url);
    const lowerDomainName = domainName.toLowerCase();
    const maxPages = (lowerDomainName === 'campuspick' || lowerDomainName === 'campuspick.com') ? 1 : 3;
    
    // 공지사항 목록 크롤링 (URL에 따라 분기 - webCrawler에서 처리)
    crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber, maxPages);
    
    if (!crawlResult.notices || crawlResult.notices.length === 0) {
      console.log(`[크롤링] ${url}: 새 공지 없음`);
      return { notificationsSent: totalProcessed, crawlResult };
    }

    // DB에 저장 (모든 공지사항 저장) Notice객체
    await saveNotices(crawlResult.notices, url, crawlDate, source);

=======
    
    // 크롤링 날짜 생성 (yymmdd-hh 형식)
    const crawlDate = formatCrawlDate();
    
    // 크롤링은 한 번만 수행 (같은 URL이므로)
    const lastKnownNumber = await getLatestNoticeNumber(url, source);
    
    // 공지사항 목록 크롤링 (URL에 따라 분기 - webCrawler에서 처리)
    const crawlResult = await crawler.crawlNoticesList(url, lastKnownNumber);
    
    if (!crawlResult.notices || crawlResult.notices.length === 0) {
      console.log(`[크롤링] ${url}: 새 공지 없음`);
      return totalProcessed;
    }
    
    // DB에 저장 (모든 공지사항 저장) Notice객체
    await saveNotices(crawlResult.notices, url, crawlDate, source);
    
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
    // 키워드 필터링 및 알림 전송
    const filteredNotices = await filterNotices(
      crawlResult.notices,
      keywordDomainPairs,
      crawler,
      url,
      crawlResult
    );
    totalProcessed = await sendNotifications(filteredNotices, crawlResult);
    
<<<<<<< HEAD
    return { notificationsSent: totalProcessed, crawlResult };
=======
    return totalProcessed;
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
  } catch (error: any) {
    console.error(`[크롤링] ${url} 크롤링 실패:`, error.message);
    throw error;
  }
}

// 필터링된 공지사항 정보
interface FilteredNotice {
  notice: NoticePreview;
  matchedPairs: KeywordDomainPair[];
  detailContent: string;
  imageUrl: string | undefined;
}

/**
 * 공지사항 목록에 대해 키워드 필터링 및 상세 페이지 크롤링
 * @param notices 공지사항 목록
 * @param keywordDomainPairs 키워드와 도메인ID 쌍 배열
 * @param crawler WebCrawler 인스턴스
 * @param url 크롤링한 URL
 * @param crawlResult 크롤링 결과 (이미지 URL 등 포함)
 * @returns 필터링된 공지사항 목록
 */
export async function filterNotices(
  notices: NoticePreview[],
  keywordDomainPairs: KeywordDomainPair[],
  crawler: WebCrawler,
  url: string,
  crawlResult: NoticeResult
): Promise<FilteredNotice[]> {
  const filteredNotices: FilteredNotice[] = [];
<<<<<<< HEAD

=======
  
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
  if (!keywordDomainPairs || keywordDomainPairs.length === 0) {
    console.log(`[필터링] 키워드-도메인 쌍이 없어 필터링 스킵`);
    return filteredNotices;
  }
  
<<<<<<< HEAD
  // 디버깅 로그 제거 (불필요한 로그)
  
  // 각 공지사항에 대해 처리
  for (const notice of notices) {
    // 공지사항 제목을 키워드와 비교
    const matchedPairs = keywordDomainPairs.filter((pair) => {
      const matched = matchesKeywords(notice.title, [pair.keyword]);
      return matched;
    });

    if (matchedPairs.length === 0) {
      continue; // 키워드 매칭 없음
    }

    console.log(
      `[크롤링] 공지사항 #${notice.number} "${notice.title}": ${matchedPairs.length}개 키워드 매칭`
    );

    // 상세 페이지 크롤링 (URL에 따라 분기)
    let detailContent = "";
=======
  // 디버깅: 키워드-도메인 쌍 정보 출력
  console.log(`[디버깅] 필터링 시작: ${notices.length}개 공지사항, ${keywordDomainPairs.length}개 키워드-도메인 쌍`);
  console.log(`[디버깅] 키워드-도메인 쌍:`, JSON.stringify(keywordDomainPairs, null, 2));
  
  // 각 공지사항에 대해 처리
  for (const notice of notices) {
    // 디버깅: 각 공지사항 제목 출력
    console.log(`[디버깅] 공지사항 체크: #${notice.number} "${notice.title}"`);
    
    // 공지사항 제목을 키워드와 비교
    const matchedPairs = keywordDomainPairs.filter(pair => {
      const matched = matchesKeywords(notice.title, [pair.keyword]);
      console.log(`[디버깅] 키워드 "${pair.keyword}" 매칭 결과: ${matched} (제목: "${notice.title}")`);
      return matched;
    });
    
    if (matchedPairs.length === 0) {
      console.log(`[디버깅] 공지사항 #${notice.number} 매칭 없음`);
      continue; // 키워드 매칭 없음
    }
    
    console.log(`[크롤링] 공지사항 #${notice.number} "${notice.title}": ${matchedPairs.length}개 키워드 매칭`);
    
    // 상세 페이지 크롤링 (URL에 따라 분기)
    let detailContent = '';
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
    let imageUrl: string | undefined = undefined;
    try {
      const detailResult = await crawler.crawlNoticeDetail(url, notice.link);
      detailContent = detailResult.content;
      imageUrl = detailResult.imageUrl;
<<<<<<< HEAD
      // 상세 페이지 크롤링 완료 로그 제거 (불필요한 로그)
    } catch (error: any) {
      console.error(
        `[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 실패:`,
        error.message
      );
      continue; // 상세 페이지 크롤링 실패 시 스킵
    }

=======
      console.log(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 완료 (${detailContent.length}자)`);
      console.log(`[크롤링] 공지사항 #${notice.number} 이미지 URL: ${imageUrl || '없음'}`);
    } catch (error: any) {
      console.error(`[크롤링] 공지사항 #${notice.number} 상세 페이지 크롤링 실패:`, error.message);
      continue; // 상세 페이지 크롤링 실패 시 스킵
    }
    
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
    // NoticeResult에 이미지 URL 저장 (첫 번째 이미지만 저장)
    if (imageUrl && !crawlResult.imageUrl) {
      crawlResult.imageUrl = imageUrl;
    }
<<<<<<< HEAD

=======
    
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
    filteredNotices.push({
      notice,
      matchedPairs,
      detailContent,
<<<<<<< HEAD
      imageUrl,
    });
  }

=======
      imageUrl
    });
  }
  
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
  return filteredNotices;
}

/**
 * 필터링된 공지사항에 대해 알림 전송
 * @param filteredNotices 필터링된 공지사항 목록
 * @param crawlResult 크롤링 결과 (이미지 URL 등 포함)
 * @returns 처리된 알림 수
 */
export async function sendNotifications(
  filteredNotices: FilteredNotice[],
  crawlResult: NoticeResult
): Promise<number> {
  let totalProcessed = 0;
<<<<<<< HEAD

  // 각 필터링된 공지사항에 대해 처리
  for (const filtered of filteredNotices) {
    const { notice, matchedPairs, detailContent, imageUrl } = filtered;

    // 각 매칭된 키워드-도메인ID 쌍에 대해 처리
    for (const pair of matchedPairs) {
      const { keyword, domain_id } = pair;

=======
  
  // 각 필터링된 공지사항에 대해 처리
  for (const filtered of filteredNotices) {
    const { notice, matchedPairs, detailContent, imageUrl } = filtered;
    
    // 각 매칭된 키워드-도메인ID 쌍에 대해 처리
    for (const pair of matchedPairs) {
      const { keyword, domain_id } = pair;
      
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
      try {
        // Domain 조회하여 setting_ids 가져오기
        const domain = await findDomainById(domain_id);
        if (!domain) {
          console.log(`[알림] domain_id ${domain_id}: Domain을 찾을 수 없음`);
          continue;
        }
<<<<<<< HEAD

=======
        
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
        if (!domain.setting_ids || domain.setting_ids.length === 0) {
          console.log(`[알림] domain_id ${domain_id}: setting_ids 없음`);
          continue;
        }
<<<<<<< HEAD

        // setting_ids로 Settings 조회
        const settings = await getSettingsByIds(domain.setting_ids);

=======
        
        // setting_ids로 Settings 조회
        const settings = await getSettingsByIds(domain.setting_ids);
        
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
        if (settings.length === 0) {
          console.log(`[알림] domain_id ${domain_id}: Settings 없음`);
          continue;
        }
        
<<<<<<< HEAD
=======
        console.log(`[알림] domain_id ${domain_id}: ${settings.length}개 Setting 발견`);
        
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
        // 각 Setting의 user_id로 알림 전송 및 Message 저장
        for (const setting of settings) {
          try {
            // 크롤링한 이미지 URL이 있으면 사용, 없으면 기본 이미지 사용
<<<<<<< HEAD
            const imageUrlForMessage = imageUrl || crawlResult.imageUrl || 'https://upload.wikimedia.org/wikipedia/ko/a/a2/PKNU_Logo.png?20210915113624';
            
            let messageContent = '';
            if (setting.summary) {
              try {
                messageContent = await getSummaryFromText(detailContent);
              } catch (summaryError: any) {
                console.error(
                  `[OpenAI] 공지사항 #${notice.number} 요약 실패:`,
                  summaryError.message
                );
                // 요약 실패 시, 기존의 잘라내기 방식으로 대체
                const truncatedContent = detailContent.substring(0, 500);
                messageContent = `${truncatedContent}${
                  detailContent.length > 500 ? "..." : ""
                }`;
              }
            } else {
              // 요약 비활성화 시, 기존의 잘라내기 방식으로 대체
              const truncatedContent = detailContent.substring(0, 500);
              messageContent = `${truncatedContent}${
                detailContent.length > 500 ? "..." : ""
              }`;
            }
            
            // messageContent가 비어있으면 기본 메시지 설정 (validation 에러 방지)
            if (!messageContent || messageContent.trim() === '') {
              messageContent = notice.title || '공지사항 내용을 확인해주세요.';
            }
            
            // messageContent가 비어있으면 기본 메시지 설정 (validation 에러 방지)
            if (!messageContent || messageContent.trim() === '') {
              messageContent = notice.title || '공지사항 내용을 확인해주세요.';
            }

            const description = messageContent;
            

            // 메시지 전송
            await routeMessageByPlatform(
              setting,
=======
            const imageUrlForMessage = imageUrl || crawlResult.imageUrl || 'https://t1.daumcdn.net/cafeattach/1YmK3/560c6415d44b9ae3c5225a255541c3c2c1568643';
            console.log(`[알림] 공지사항 #${notice.number} "${notice.title}"`);
            console.log(`[알림] - 현재 공지사항 이미지 URL: ${imageUrl || '없음'}`);
            console.log(`[알림] - 전체 결과 이미지 URL: ${crawlResult.imageUrl || '없음'}`);
            console.log(`[알림] - 최종 사용할 이미지 URL: ${imageUrlForMessage}`);
            
            // 상세 내용을 description에 포함 (500자 제한)
            const truncatedContent = detailContent.substring(0, 500);
            const description = `${truncatedContent}${detailContent.length > 500 ? '...' : ''}`;
            
            // 메시지 내용 구성 (제목 + 상세 내용)
            const messageContent = `${detailContent.substring(0, 500)}${detailContent.length > 500 ? '...' : ''}`;
            
            // 카카오 메시지 전송
            await sendKakaoMessage(
              setting.user_id,
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
              notice.title,
              description,
              imageUrlForMessage,
              notice.link
            );
<<<<<<< HEAD

            
            // Message 저장
            const settingId = setting._id ? String(setting._id) : setting.id;
            await saveMessage(
              settingId,
              messageContent,
              "kakao",
              notice.link,
              notice.title,
              imageUrlForMessage
            );

            totalProcessed++;
            console.log(`[알림] 공지사항 #${notice.number} "${notice.title}": ${settings.length}개 Setting에 알림 전송 완료`);
            
            // 메시지 전송 간 딜레이 (API 제한 방지)
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error: any) {
            console.error(
              `[알림] Setting "${setting.name}" 알림 전송 실패:`,
              error.message
            );
=======
            
            // Message 저장
            const settingId = setting._id ? String(setting._id) : setting.id;
            await saveMessage(settingId, messageContent, 'kakao', notice.link, notice.title, imageUrlForMessage);
            
            totalProcessed++;
            console.log(`[알림] Setting "${setting.name}" (user_id: ${setting.user_id}): 공지사항 #${notice.number} 알림 전송 완료`);
            
            // 메시지 전송 간 딜레이 (API 제한 방지)
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error: any) {
            console.error(`[알림] Setting "${setting.name}" 알림 전송 실패:`, error.message);
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
            // 개별 메시지 실패는 전체 작업을 중단하지 않음
          }
        }
      } catch (error: any) {
<<<<<<< HEAD
        console.error(
          `[알림] domain_id ${domain_id} 처리 실패:`,
          error.message
        );
=======
        console.error(`[알림] domain_id ${domain_id} 처리 실패:`, error.message);
>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
        // 개별 도메인 실패는 전체 작업을 중단하지 않음
      }
    }
  }
<<<<<<< HEAD

  return totalProcessed;
}
=======
  
  return totalProcessed;
}


>>>>>>> e63247e0695b482ebec755590d1290ce3241b8d1
