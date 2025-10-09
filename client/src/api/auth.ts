import http, { tokenStore } from "./http";

// 카카오, 디스코드 연결 상태
export type ChannelState = "disconnected" | "off" | "on";

// 사용자 정보
export type User = {
  id?: number | string;
  name: string;
  email: string;
  kakao: ChannelState;
  discord: ChannelState;
};

// main 도메인
export type Domain = {
  id: number | string;
  name: string;
  urlList?: string[];
  urls?: string[];
  keywords: string[];
};

// 카카오 로그인 관련
export async function beginKakaoLogin(state?: string) {
  const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/auth/kakao/login`);
  if (state) url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

// 콜백 이후 app_code 교환 -> 서비스 토큰 획득
export async function exchangeKakao(appCode: string) {
  const { data } = await http.post<{
    accessToken: string;
    refreshToken: string;
    user: User;
  }>("/auth/kakao/exchange", { appCode });
  tokenStore.setAccess(data.accessToken);
  tokenStore.setRefresh(data.refreshToken);
  return data.user;
}

// 내 정보 조회
export async function me() {
  const { data } = await http.get<User>("/users");
  return data;
}

// 사용자 정보 업데이트
export async function updateUserChannels(
  payload: Partial<Pick<User, "kakao" | "discord">>
) {
  const { data } = await http.put<Pick<User, "kakao" | "discord">>(
    "/users",
    payload
  );
  return data;
}

// 회원탈퇴
export async function deleteUser() {
  await http.delete("/users");
}

// 메인 도메인 목록 조회
export async function fetchMain() {
  const { data } = await http.get<{ domains: Domain[] }>("/main");
  return data;
}

// 로그아웃(서버 엔드포인트 없으면 토큰만 비움)
export async function logout() {
  try {
    await http.post("/auth/logout"); // 없으면 그냥 무시
  } catch {}
  tokenStore.setAccess(null);
  tokenStore.setRefresh(null);
}

// 리프레시 토큰으로 액세스 토큰 재발급
export async function refreshToken() {
  const rt = tokenStore.getRefresh();
  if (!rt) throw new Error("NO_REFRESH_TOKEN");
  const { data } = await http.post<{ accessToken: string }>("/auth/refresh", {
    refreshToken: rt,
  });
  const newAT = data?.accessToken;
  if (!newAT) throw new Error("INVALID_REFRESH_RESPONSE");
  tokenStore.setAccess(newAT);
  return newAT;
}
