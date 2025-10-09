// client/src/api/auth.ts
import http, { tokenStore } from "./http";

/** 카카오/디스코드 연결 상태 */
export type ChannelState = "disconnected" | "off" | "on";

/** 사용자 정보 (표: name, email, kakao, discord) */
export type User = {
  id?: number | string;
  name: string;
  email: string;
  kakao: ChannelState;
  discord: ChannelState;
};

/** /main 응답에 들어오는 도메인 객체 (표 설명에 맞춤) */
export type Domain = {
  id: number | string;
  name: string;
  urlList?: string[]; // 백엔드 key가 url list(배열) → urlList 가정
  urls?: string[]; // 혹시 urls로 내려줄 수도 있어 안전용으로 둘 다 허용
  keywords: string[];
};

/** 1) 카카오 로그인 시작 (302 따라감) */
export async function beginKakaoLogin(state?: string) {
  const url = new URL(`${import.meta.env.VITE_API_BASE_URL}/auth/kakao/login`);
  if (state) url.searchParams.set("state", state);
  window.location.assign(url.toString());
}

/** 2) 콜백 이후 app_code 교환 → 우리 서비스 토큰 획득 */
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

/** 3) 내 정보 조회 (표: GET /users) */
export async function me() {
  const { data } = await http.get<User>("/users");
  return data;
}

/** 4) 사용자 정보 업데이트 (표: PUT /users, body에 kakao/discord 상태) */
export async function updateUserChannels(
  payload: Partial<Pick<User, "kakao" | "discord">>
) {
  const { data } = await http.put<Pick<User, "kakao" | "discord">>(
    "/users",
    payload
  );
  return data; // { kakao, discord }
}

/** 5) 회원탈퇴 (표: DELETE /users — 나중에 구현될 수 있으니 호출만 준비) */
export async function deleteUser() {
  await http.delete("/users");
}

/** 6) 메인 도메인 목록 (표: GET /main → { domains: domain[] }) */
export async function fetchMain() {
  const { data } = await http.get<{ domains: Domain[] }>("/main");
  return data;
}

/** 7) 로그아웃(서버 엔드포인트 없으면 토큰만 비움) */
export async function logout() {
  try {
    await http.post("/auth/logout"); // 없으면 그냥 무시됨
  } catch {}
  tokenStore.setAccess(null);
  tokenStore.setRefresh(null);
}

/** 8) (고급) 리프레시 토큰으로 액세스 토큰 재발급 */
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
