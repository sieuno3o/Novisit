import { Notice, INotice } from '../../models/Notice.js';
import CrawlMeta from '../../models/CrawlMeta.js';
import { PKNUNotice } from '../../types/crawl.js';

/**
 * 가장 최신 공지사항 번호 조회 (URL별)
 */
export async function getLatestNoticeNumber(url: string, source: string = 'PKNU'): Promise<string | null> {
  try {
    const latest = await Notice.findOne({ url, source })
      .sort({ number: -1 })
      .select('number')
      .exec();
    
    return latest ? latest.number : null;
  } catch (error) {
    console.error('[DB] 최신 공지번호 조회 오류:', error);
    return null;
  }
}

/**
 * 특정 URL의 모든 공지사항 조회 (최신순)
 */
export async function getNoticesByUrl(url: string, source: string = 'PKNU'): Promise<INotice[]> {
  try {
    const notices = await Notice.find({ url, source })
      .sort({ number: -1 })
      .exec();
    
    return notices;
  } catch (error) {
    console.error('[DB] URL별 공지사항 조회 오류:', error);
    return [];
  }
}

/**
 * 이전 시간대의 최신 번호 조회
 * @param url 크롤링할 URL
 * @param currentCrawlDate 현재 크롤링 날짜 (yymmdd-hh)
 * @param source 소스 (기본값: 'PKNU')
 */
export async function getPreviousLatestNumber(url: string, currentCrawlDate: string, source: string = 'PKNU'): Promise<string | null> {
  try {
    // 현재 시간대보다 이전의 크롤링 메타데이터 조회
    const previousMeta = await CrawlMeta.findOne({ url, source, crawlDate: { $lt: currentCrawlDate } })
      .sort({ crawlDate: -1 })
      .select('latestNumber')
      .exec();
    
    return previousMeta ? previousMeta.latestNumber : null;
  } catch (error) {
    console.error('[DB] 이전 최신번호 조회 오류:', error);
    return null;
  }
}

/**
 * 공지사항을 MongoDB에 저장 (새로운 것만 삽입)
 * 중복은 unique index로 자동 방지
 * @param notices 공지사항 배열
 * @param url 크롤링한 URL
 * @param crawlDate 크롤링 날짜 (yymmdd-hh 형식)
 * @param source 소스 (기본값: 'PKNU')
 * @returns 저장된 최신 공지번호 (공지가 없으면 null)
 */
export async function saveNotices(notices: PKNUNotice[], url: string, crawlDate: string, source: string = 'PKNU'): Promise<string | null> {
  try {
    let insertedCount = 0;
    let duplicateCount = 0;
    let maxNumber: string | null = null;

    // 공지가 있는 경우 가장 큰 번호 찾기
    if (notices.length > 0 && notices[0]) {
      maxNumber = notices[0].number;
      for (let i = 1; i < notices.length; i++) {
        const notice = notices[i];
        if (!notice) continue;
        const currentNum = parseInt(notice.number);
        const maxNum = parseInt(maxNumber || '0');
        if (currentNum > maxNum) {
          maxNumber = notice.number;
        }
      }
    }

    for (const notice of notices) {
      try {
        await Notice.create({
          number: notice.number,
          title: notice.title,
          link: notice.link,
          url: url,
          crawlDate: crawlDate,
          source: source,
          postedAt: notice.postedAt,
          crawledAt: notice.crawledAt,
        });
        insertedCount++;
      } catch (error: any) {
        // 중복 키 에러 (이미 존재하는 공지사항)
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          console.error(`공지사항 저장 실패 (번호: ${notice.number}):`, error);
        }
      }
    }

    // 크롤링 메타데이터 저장
    let latestNumberToSave = maxNumber;
    
    // 공지가 없으면 이전 시간대에서 가져오기
    if (!latestNumberToSave) {
      latestNumberToSave = await getPreviousLatestNumber(url, crawlDate, source);
    }

    if (latestNumberToSave) {
      await CrawlMeta.create({
        crawlDate: crawlDate,
        url: url,
        latestNumber: latestNumberToSave,
        noticesCount: insertedCount,
        source: source,
        crawledAt: new Date(),
      });
      console.log(`[저장] ${crawlDate} URL "${url}": 새 공지 ${insertedCount}개 | 중복 ${duplicateCount}개 | 최신번호: ${latestNumberToSave}`);
    } else {
      console.log(`[저장] ${crawlDate} URL "${url}": 새 공지 ${insertedCount}개 | 중복 ${duplicateCount}개 | 최신번호: 없음`);
    }

    return latestNumberToSave;
  } catch (error) {
    console.error('공지사항 일괄 저장 오류:', error);
    throw error;
  }
}

