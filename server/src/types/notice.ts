// 공지사항 미리보기 데이터 (목록에서 제목과 함께 보이는 정보)
export interface NoticePreview {
  number: string;
  title: string;
  link: string;
  postedAt: string;    // 공지사항 작성일자 (실제 게시된 날짜)
  crawledAt: Date;      // 크롤링한 시간
}

// 공지사항 크롤링 결과
export interface NoticeResult {
  url: string;
  title: string;
  timestamp: string;
  totalNotices: number;
  notices: NoticePreview[];
  summary: {
    extractedAt: string;
    source: string;
    totalCount: number;
  };
  // 키워드 필터링 정보
  keyword?: string;
  domain_id?: string;
  // 상세 페이지 첫 번째 이미지 URL
  imageUrl?: string;
}

