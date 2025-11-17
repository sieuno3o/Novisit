/**
 * URL 유틸리티 함수들
 */

// URL에서 도메인 이름 추출 (예: www.pknu.ac.kr -> pknu, www.naver.com -> naver)
export function extractDomainName(url: string): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const parts = hostname.split('.');
    
    if (parts.length >= 2 && parts[0] === 'www' && parts[1]) {
      return parts[1];
    } else if (parts.length >= 1 && parts[0]) {
      return parts[0];
    }
    
    return hostname || 'unknown';
  } catch (error) {
    // URL 파싱 실패 시 호스트명에서 직접 추출 시도
    const match = url.match(/\/\/(?:www\.)?([^./]+)/);
    return match && match[1] ? match[1] : 'unknown';
  }
}

// URL에서 소스 이름 추출 (PKNU, NAVER 등)
export function getSourceFromUrl(url: string): string {
  const domainName = extractDomainName(url);
  return domainName.toUpperCase();
}

