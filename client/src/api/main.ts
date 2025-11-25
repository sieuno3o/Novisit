// src/api/main.ts
import http from "./http";

/** 백엔드에서 내려주는 원본 도메인 DTO */
export type DomainDto = {
  id: string;
  name: string;
  desc?: string; // 서버 설명(선택)
  icon?: string; // lucide 아이콘 이름(선택, 예: "Globe")
  keywords?: string[]; // 키워드 목록(선택)
};

export type MainResponse = {
  domains: DomainDto[];
};

/** 프론트에서 사용하는 도메인 타입 */
export type Domain = {
  id: string;
  name: string;
  desc?: string;
  icon?: string;
  keywords?: string[];
};

/** DTO → Domain 매핑 */
const mapDto = (d: DomainDto): Domain => ({
  id: d.id,
  name: d.name,
  desc: d.desc,
  icon: d.icon,
  keywords: d.keywords ?? [],
});

/** 토큰 불필요 메인 도메인 목록 조회 */
export async function fetchMain(): Promise<Domain[]> {
  const { data } = await http.get<MainResponse>("/api/main");
  return (data.domains ?? []).map(mapDto);
}
