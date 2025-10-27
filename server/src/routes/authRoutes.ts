import { Router, Request, Response } from "express";
import { kakaoCallback } from "../auth/kakao";
import { linkDiscordAccount } from "../auth/discord";
import {
  verifyRefreshToken,
  generateTokens,
  verifyAccessToken,
} from "../auth/jwt";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  unlinkDiscord,
  // updateKakaoNotificationSetting, // 사용 안 하면 주석/삭제
} from "../services/authService";

const router = Router();

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

/** 프론트의 OAuth 완료 페이지 경로 (/oauth/kakao) 절대 URL 생성 */
function frontFinishUrl() {
  return new URL("/oauth/kakao", FRONTEND_BASE_URL).toString();
}

// 카카오 로그인 시작: 프론트에서 이 주소로 이동
router.get("/kakao/login", (req, res) => {
  const clientId = process.env.KAKAO_CLIENT_ID!;
  const redirectUri = process.env.KAKAO_REDIRECT_URI!;
  const scope = "profile_nickname,account_email,talk_message";

  const state = (req.query.state as string) || "/"; // 로그인 후 돌아갈 경로

  let kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  const prompt = req.query.prompt as string | undefined;
  if (prompt) {
    kakaoAuthUrl += `&prompt=${encodeURIComponent(prompt)}`;
  }

  res.redirect(kakaoAuthUrl);
});

// 디스코드 연동 시작
router.get("/discord/login", authMiddleware, (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const discordAuthUrl =
    `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}` +
    `&response_type=code&scope=identify%20email` +
    `&state=${token}`;
  res.json({ discordAuthUrl });
});

// 카카오 로그인 콜백 → 프론트로 302 리다이렉트(해시로 토큰 전달)
router.get("/kakao/callback", async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string | undefined; // authorization code
    const scope = req.query.scope as string | undefined; // optional
    const state = (req.query.state as string | undefined) || "/";

    if (!code) {
      // 실패 시에도 프론트로 이동 (에러 쿼리 전달)
      const url = `${frontFinishUrl()}?error=${encodeURIComponent(
        "NO_CODE"
      )}&state=${encodeURIComponent(state)}`;
      return res.redirect(302, url);
    }

    // 1) 카카오 code 교환 → 우리 서비스 JWT 발급
    //    kakaoCallback 시그니처는 (code: string, scope?: string) 로 두는 걸 권장
    const jwtTokens = await kakaoCallback(code, scope);
    if (!jwtTokens?.accessToken || !jwtTokens?.refreshToken) {
      const url = `${frontFinishUrl()}?error=${encodeURIComponent(
        "ISSUE_TOKEN_FAIL"
      )}&state=${encodeURIComponent(state)}`;
      return res.redirect(302, url);
    }

    // 2) 프론트 콜백 라우트로 해시(#)에 토큰 실어서 보냄
    //    예: http://localhost:5173/oauth/kakao#accessToken=...&refreshToken=...&state=/...
    const finish = frontFinishUrl();
    const redirect =
      `${finish}#accessToken=${encodeURIComponent(jwtTokens.accessToken)}` +
      `&refreshToken=${encodeURIComponent(jwtTokens.refreshToken)}` +
      `&state=${encodeURIComponent(state)}`;

    return res.redirect(302, redirect);
  } catch (err) {
    console.error(err);
    const state = (req.query.state as string | undefined) || "/";
    const url = `${frontFinishUrl()}?error=${encodeURIComponent(
      "KAKAO_LOGIN_FAIL"
    )}&state=${encodeURIComponent(state)}`;
    return res.redirect(302, url);
  }
});

// 디스코드 연동 콜백
router.get("/discord/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const token = req.query.state as string;

    if (!token) {
      return res.status(400).json({ message: "Token not found in state" });
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.id;

    await linkDiscordAccount(code, userId);
    res.json({ message: "디스코드 계정이 성공적으로 연동되었습니다." });
  } catch (err: any) {
    console.error(err);
    if (err.message.includes("EXPIRED")) {
      return res
        .status(401)
        .json({ message: "연동 세션이 만료되었습니다. 다시 시도해주세요." });
    }
    res.status(500).json({ error: "디스코드 연동 실패", message: err.message });
  }
});

// refresh 토큰을 받아서 새로운 access, refresh 토큰 발급
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "RefreshToken 필요" });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens(payload);
    res.json(tokens);
  } catch (err: any) {
    if (err.message.includes("EXPIRED"))
      return res.status(401).json({ message: "RefreshToken 만료" });
    return res.status(403).json({ message: "유효하지 않은 RefreshToken" });
  }
});

// 디스코드 연동 해제
router.delete("/discord", authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const updatedUser = await unlinkDiscord(userId);

    if (!updatedUser) {
      return res
        .status(404)
        .json({ message: "사용자를 찾을 수 없거나 업데이트할 수 없습니다." });
    }

    res
      .status(200)
      .json({ message: "디스코드 연동이 성공적으로 해제되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "디스코드 연동 해제 실패" });
  }
});

export default router;
