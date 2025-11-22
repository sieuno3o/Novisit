import http from "../api/http";

export type DomainDto = {
  id: string;
  name: string;
  desc: string; // ← 새 필드
  icon: string; // ← 새 필드 (예: "Globe")
};

export type MainResponse = {
  domains: DomainDto[];
};

export type Domain = {
  id: string;
  name: string;
  urls: string[]; // url_list → urls 로 변환
  keywords: string[];
};

const mapDto = (d: DomainDto): Domain => ({
  id: d.id,
  name: d.name,
  desc: d.desc,
  icon: d.icon,
});

//토큰 불필요
export async function fetchMain(): Promise<Domain[]> {
  const { data } = await http.get<MainResponse>("/api/main");
  return (data.domains ?? []).map(mapDto);
}
