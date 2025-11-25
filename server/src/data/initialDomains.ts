/**
 * 서버 최초 실행 시 자동으로 생성될 초기 도메인 데이터
 * 이 파일을 수정하여 초기 도메인을 설정할 수 있습니다.
 */

export interface InitialDomainData {
  _id?: string | number; // 명시적으로 지정할 _id (옵셔널)
  name: string;
  url_list: string[];
  keywords: string[];
  setting_ids?: string[];
}

export const initialDomains: InitialDomainData[] = [
  {
    _id: "1", // 명시적으로 _id 지정 (문자열 또는 숫자 가능)
    name: "공모전",
    url_list: [
      "https://www.pknu.ac.kr/main/163",
    ],
    keywords: ["공모전"],
    setting_ids: [],
  },
  {
    _id: "2",
    name: "장학",
    url_list: [
      "https://www.pknu.ac.kr/main/163",
    ],
    keywords: ["장학"],
    setting_ids: [],
  },
  {
    _id: "3",
    name: "교환학생",
    url_list: [
      "https://www.pknu.ac.kr/main/163",
    ],
    keywords: ["교환학생"],
    setting_ids: [],
  },
  {
    _id: "4",
    name: "테스트",
    url_list: [
      "https://pknu-notice-watch.lovable.app",
    ],
    keywords: ["테스트"],
    setting_ids: [],
  },
  {
    _id: "5",
    name: "창업",
    url_list: [
      "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do",
      "https://www.mss.go.kr/site/smba/ex/bbs/List.do?cbIdx=310",
    ],
    keywords: ["창업"],
    setting_ids: [],
  },
  {
    _id: "6",
    name: "해커톤",
    url_list: [
      "https://www.campuspick.com/contest?category=108",
    ],
    keywords: ["해커톤"],
    setting_ids: [],
  },
  // 필요에 따라 더 많은 도메인을 추가할 수 있습니다
  // {
  //   _id: "2", // 또는 숫자로 _id: 2
  //   name: "Another Domain",
  //   url_list: ["https://another.com"],
  //   keywords: ["news", "updates"],
  //   setting_ids: [],
  // },
];

