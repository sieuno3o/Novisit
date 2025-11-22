import { Router, Request, Response } from "express";
import { kakaoCallback } from "../auth/kakao.js";
import { linkDiscordAccount } from "../auth/discord.js";
import {
  verifyRefreshToken,
  generateTokens,
  verifyAccessToken,
} from "../auth/jwt.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  unlinkDiscord,
  // updateKakaoNotificationSetting, // 사용 안 하면 주석/삭제
  ////// hw-카카오톡
  updateKakaoNotificationSetting, 
  //////hw
} from "../services/authService.js";

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


// wm...hw 주석처리
// // 디스코드 연동 콜백
// router.get("/discord/callback", async (req, res) => {
//   try {
//     const code = req.query.code as string;
//     const token = req.query.state as string;

//     if (!token) {
//       return res.status(400).json({ message: "Token not found in state" });
//     }

//     const decoded = verifyAccessToken(token);
//     const userId = decoded.id;

//     await linkDiscordAccount(code, userId);
//     res.json({ message: "디스코드 계정이 성공적으로 연동되었습니다." });
//   } catch (err: any) {
//     console.error(err);
//     if (err.message.includes("EXPIRED")) {
//       return res
//         .status(401)
//         .json({ message: "연동 세션이 만료되었습니다. 다시 시도해주세요." });
//     }
//     res.status(500).json({ error: "디스코드 연동 실패", message: err.message });
//   }
// });


////// hw-디스코드 연동 콜백
router.get("/discord/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;

  // 프론트 주소
  const CLIENT = process.env.CLIENT_URL ?? "http://localhost:5173";

  try {
    if (!state) {
      // state 누락: 프론트로 에러 리다이렉트
      return res.redirect(`${CLIENT}/my?discord=error_state`);
    }

    // (현재 로직 유지) state에 담긴 토큰 검증 → userId 추출
    const decoded = verifyAccessToken(state);
    const userId = decoded.id;

    // 인가코드로 연동 처리 (토큰 교환 + DB 업데이트)
    await linkDiscordAccount(code!, userId);

    // 성공: 반드시 프론트로 리다이렉트
    return res.redirect(`https://discord.gg/YVEn24mrbt`);
  } catch (err: any) {
    console.error("discord callback error:", err?.message || err);

    // 케이스별 쿼리 파라미터로 전달 (프론트에서 토스트/메시지 표시)
    let reason = "error";
    const msg = String(err?.message ?? "");

    if (msg.includes("EXPIRED")) reason = "expired";
    else if (msg.includes("이미 다른 계정에") || msg.includes("already")) reason = "already_linked";
    else if (msg.includes("invalid_grant") || msg.includes('Invalid "code"')) reason = "invalid_code";

    return res.redirect(`${CLIENT}/my?discord=${reason}`);
  }
});
//////hw



// refresh 토큰을 받아서 새로운 access, refresh 토큰 발급
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "RefreshToken 필요" });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens(payload);
    return res.json(tokens);
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

    return res
      .status(200)
      .json({ message: "디스코드 연동이 성공적으로 해제되었습니다." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "디스코드 연동 해제 실패" });
  }
});



////// hw-카카오 알림 설정 ON/OFF (정식 경로)
router.patch("/kakao/talk", authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body ?? {};
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled:boolean 필요" });
    }

    const updated = await updateKakaoNotificationSetting(req.user!.id, enabled);
    if (!updated) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    // 명세에 맞춘 응답 형태
    return res.status(200).json({
      message: "카카오 알림 설정이 변경되었습니다.",
      user: {
        _id: updated.id,
        kakao: updated.providers?.find((p: any) => p.provider === "kakao") ?? null,
        preferences: { receiveKakaoNotifications: Boolean(enabled) },
      },
    });
  } catch (e) {
    console.error("kakao/talk error:", e);
    return res.status(500).json({ message: "카카오 알림 설정 변경 실패" });
  }
});
////// hw
////// hw-호환용 경로 (다른 팀/버전 대응: /auth/notifications/kakao)
router.patch("/notifications/kakao", authMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body ?? {};
    if (typeof enabled !== "boolean") {
      return res.status(400).json({ message: "enabled:boolean 필요" });
    }

    const updated = await updateKakaoNotificationSetting(req.user!.id, enabled);
    if (!updated) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    return res.status(200).json({
      message: "카카오 알림 설정이 변경되었습니다.",
      user: {
        _id: updated.id,
        kakao: updated.providers?.find((p: any) => p.provider === "kakao") ?? null,
        preferences: { receiveKakaoNotifications: Boolean(enabled) },
      },
    });
  } catch (e) {
    console.error("notifications/kakao error:", e);
    return res.status(500).json({ message: "카카오 알림 설정 변경 실패" });
  }
});
////// hw

export default router;
