import http from "./http";


// 카카오톡 연결 변경
export async function setKakaoEnabled(enabled: boolean): Promise<void> {
  
  try {
    await http.patch("/auth/notifications/kakao", { enabled });
    return;
  } catch (e: unknown) {
    const s = (e as { response?: { status?: number } })?.response?.status;
    
    if (s !== 404 && s !== 405) throw e;
  }

  // 다른 구현에서 쓰는 경로
  try {
    await http.patch("/auth/kakao/talk", { enabled });
    return;
  } catch (e: unknown) {
    const s = (e as { response?: { status?: number } })?.response?.status;
    if (s !== 404 && s !== 405) throw e;
  }

  // PUT만 허용하는 서버 대응
  await http.put("/auth/notifications/kakao", { enabled });
}


// 디스코드 연결: 로그인 URL 받아서 프론트가 리다이렉트
export async function getDiscordAuthUrl(): Promise<string> {
  const { data } = await http.get<{ discordAuthUrl: string }>("/auth/discord/login");
  return data.discordAuthUrl;
}


// 디스코드 연결 해제
export async function unlinkDiscord(): Promise<string> {
  const { data } = await http.delete<{ message: string }>("/auth/discord", { withCredentials: true });
  return data?.message ?? "";
}
