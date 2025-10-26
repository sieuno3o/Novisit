import http, { tokenStore, hardLogout } from "./http";

// 타입
export type ChannelState = "disconnected" | "off" | "on";
export type User = {
  id?: number | string;
  name: string;
  email: string;
  kakao: ChannelState;
  discord: ChannelState;
};

export type Domain = {
  id: number | string;
  name: string;
  urlList?: string[];
  urls?: string[];
  keywords: string[];
};

// 하드 로그아웃 외부에서도 쓸 수 있게 re-export (선택)
export { hardLogout } from "./http";

// 카카오 시작
export async function beginKakaoLogin(state?: string) {
  const safeState = state ?? "/";
  // 콜백에서 쿼리에 state가 없을 때 사용할 백업
  sessionStorage.setItem("__oauth_state", safeState);

  const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/auth/kakao/login`);
  url.searchParams.set("state", safeState);
  window.location.assign(url.toString());
}

// (옵션) 콜백 교환 엔드포인트 사용하는 경우
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

// 내 정보 조회 (서버 계약에 맞춰 경로 확인)
export async function me() {
  const { data } = await http.get<User>("/users"); // 서버가 /auth/me면 변경
  return data;
}

export async function updateUserChannels(
  payload: Partial<Pick<User, "kakao" | "discord">>
) {
  const { data } = await http.put<Pick<User, "kakao" | "discord">>(
    "/users",
    payload
  );
  return data;
}

export async function deleteUser() {
  await http.delete("/users");
}

// 메인 도메인
export async function fetchMain() {
  const { data } = await http.get<{ domains: Domain[] }>("/main");
  return data;
}

// 로그아웃(엔드포인트 없을 수도 있음)
export async function logout() {
  try {
    await http.post("/auth/logout"); // 없으면 무시
  } catch {}
  // 통신 여부 무관하게 즉시 클라이언트 상태 정리 + /login 이동
  hardLogout();
}
