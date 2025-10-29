import http from "../api/http";


export type DomainDto = {
  id: string;
  name: string;
  url_list: string[];
  keywords: string[];
};


export type MainResponse = {
  domains: DomainDto[];
};


export type Domain = {
  id: string;
  name: string;
  urls: string[];      // url_list → urls 로 변환
  keywords: string[];
};


const mapDto = (d: DomainDto): Domain => ({
  id: d.id,
  name: d.name,
  urls: d.url_list,
  keywords: d.keywords,
});


//토큰 불필요
export async function fetchMain(): Promise<Domain[]> {
  const { data } = await http.get<MainResponse>("/main");
  return (data.domains ?? []).map(mapDto);
}
