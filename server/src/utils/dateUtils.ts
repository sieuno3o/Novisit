/**
 * 날짜 유틸리티 함수들
 */

/**
 * 크롤링 날짜를 yymmdd-hh 형식으로 포맷팅
 * @param date 포맷팅할 날짜 (기본값: 현재 시간)
 * @returns yymmdd-hh 형식의 문자열 (예: "241215-14")
 */
export function formatCrawlDate(date: Date = new Date()): string {
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  return `${yy}${mm}${dd}-${hh}`;
}

/**
 * 날짜를 yymmdd 형식으로 포맷팅 (시간 없음)
 * @param date 포맷팅할 날짜 (기본값: 현재 시간)
 * @returns yymmdd 형식의 문자열 (예: "241215")
 */
export function formatDate(date: Date = new Date()): string {
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

