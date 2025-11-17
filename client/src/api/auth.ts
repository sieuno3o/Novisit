import http, { tokenStore, hardLogout } from "./http";

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

export async function beginKakaoLogin(from: string = "/") {
  sessionStorage.setItem(
    "__oauth_state",
    JSON.stringify({ from, t: Date.now() })
  );

  const API_BASE = (import.meta.env.VITE_API_BASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const path = "/auth/kakao/login";

  let redirectUrl: string;

  if (API_BASE) {
    const url = new URL(path, API_BASE);
    url.searchParams.set("state", from);
    redirectUrl = url.toString();
  } else {
    redirectUrl = `${path}?state=${encodeURIComponent(from)}`;
  }

  window.location.assign(redirectUrl);
}

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

export async function me() {
  const { data } = await http.get<User>("/api/users");
  return data;
}

export async function updateUserChannels(
  payload: Partial<Pick<User, "kakao" | "discord">>
) {
  const { data } = await http.put<Pick<User, "kakao" | "discord">>(
    "/api/users",
    payload
  );
  return data;
}

export async function deleteUser() {
  await http.delete("/api/users");
}

export async function fetchMain() {
  const { data } = await http.get<{ domains: Domain[] }>("/api/main");
  return data;
}

export async function logout() {
  try {
    await http.post("/auth/logout");
  } catch {}
  hardLogout({ redirectTo: "/" });
}
