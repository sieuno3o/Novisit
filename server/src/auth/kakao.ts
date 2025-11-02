import axios from "axios";
import { generateTokens } from "./jwt.js";
import { findOrCreateUser } from "../services/authService.js";

// 카카오 로그인 콜백
// scope는 카카오가 안 줄 수도 있으므로 optional 처리
export async function kakaoCallback(code: string, scope?: string) {
  // 1. Authorization Code → Access Token 교환
  const tokenResponse = await axios.post(
    "https://kauth.kakao.com/oauth/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_CLIENT_ID!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      code,
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  // 2. 사용자 정보 조회
  const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const kakaoUser = userResponse.data;
  const kakaoId = String(kakaoUser.id);
  const kakaoEmail = kakaoUser.kakao_account?.email ?? null;
  const kakaoNickname = kakaoUser.kakao_account?.profile?.nickname ?? "Unknown";

  // scope는 콤마/공백 어떤 구분자로 와도 대응
  const parsedScopes =
    typeof scope === "string" ? scope.split(/[,\s]+/).filter(Boolean) : [];

  // 3. UserProfile 형태로 변환
  const userProfile = {
    id: kakaoId,
    email: kakaoEmail,
    name: kakaoNickname,
    scopes: parsedScopes,
    accessToken: access_token,
    refreshToken: refresh_token,
    expiresIn: expires_in,
  };

  // 4. DB에서 사용자 찾거나 생성
  const user = await findOrCreateUser("kakao", userProfile);

  // 5. 자체 JWT 발급
  const payload = {
    id: String(user._id),
    name: user.name ?? kakaoNickname,
    email: user.email ?? kakaoEmail,
  };

  return generateTokens(payload);
}
