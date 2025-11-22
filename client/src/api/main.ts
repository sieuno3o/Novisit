import http from "../api/http";

// 서버에서 내려주는 원본 DTO 타입
export type DomainDto = {
  id: string;
  name: string;
  desc: string;   // ← 새 필드
  icon: string;   // ← 새 필드 (예: "Globe")
};

export type MainResponse = {
  domains: DomainDto[];
};

// 프론트에서 사용할 도메인 타입
export type Domain = {
  id: string;
  name: string;
  desc: string;   // 카드/모달에서 설명으로 사용
  icon: string;   // 아이콘 매핑용 문자열
};

// DTO → Domain 변환
const mapDto = (d: DomainDto): Domain => ({
  id: d.id,
  name: d.name,
  desc: d.desc,
  icon: d.icon,
});

// 토큰 불필요
export async function fetchMain(): Promise<Domain[]> {
  // 이 부분의 URL은 백엔드에서 정의한 "제공 도메인 조회" 엔드포인트 그대로 사용
  // (지금처럼 /main 이 그 역할이라면 그대로 두면 됨)
  const { data } = await http.get<MainResponse>("/main");

  // domains가 없거나 null일 수 있으니 방어적으로 처리
  return (data.domains ?? []).map(mapDto);
}