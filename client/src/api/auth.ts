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

export { hardLogout } from "./http";

export async function beginKakaoLogin(from: string = "/", options?: { prompt?: 'login' }) {
  sessionStorage.setItem(
    "__oauth_state",
    JSON.stringify({ from, t: Date.now() })
  );
  const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/auth/kakao/login`);
  url.searchParams.set("state", from);
  if (options?.prompt) {
    url.searchParams.set("prompt", options.prompt);
  }
  window.location.replace(url.toString());
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

// 내 정보 조회
export async function me() {
  const { data } = await http.get<User>("/users");
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

export async function fetchMain() {
  const { data } = await http.get<{ domains: Domain[] }>("/main");
  return data;
}

export async function logout() {
  try {
    await http.post("/auth/logout");
  } catch {
    // 로그아웃 실패해도 강제 로그아웃 진행
  }
  hardLogout({ redirectTo: "/" });
}
