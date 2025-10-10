import { Notice, INotice } from '../../models/Notice.js';
import { PKNUNotice } from '../../types/crawl.js';

/**
 * 가장 최신 공지사항 번호 조회
 */
export async function getLatestNoticeNumber(source: string = 'PKNU'): Promise<string | null> {
  try {
    const latest = await Notice.findOne({ source })
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
 * 공지사항을 MongoDB에 저장 (새로운 것만 삽입)
 * 중복은 unique index로 자동 방지
 */
export async function saveNotices(notices: PKNUNotice[], source: string = 'PKNU'): Promise<void> {
  try {
    let insertedCount = 0;
    let duplicateCount = 0;

    for (const notice of notices) {
      try {
        await Notice.create({
          number: notice.number,
          title: notice.title,
          link: notice.link,
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

    console.log(`[저장] 새 공지: ${insertedCount}개 | 중복: ${duplicateCount}개`);
  } catch (error) {
    console.error('공지사항 일괄 저장 오류:', error);
    throw error;
  }
}

