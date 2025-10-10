import { Router } from 'express';
import { kakaoCallback } from '../auth/kakao';
import { linkDiscordAccount } from '../auth/discord';
import { verifyRefreshToken, generateTokens, verifyAccessToken } from '../auth/jwt';
import { authMiddleware } from '../middleware/authMiddleware';
const router = Router();

// 카카오 로그인 프론트에서 이 주소로 이동시킴
router.get('/kakao/login', (req, res) => {
  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}` +
    `&redirect_uri=${process.env.KAKAO_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=profile_nickname,account_email,talk_message`;
  res.redirect(kakaoAuthUrl);
});

// 디스코드 연동 시작 라우트
router.get('/discord/login', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const discordAuthUrl =
    `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}` +
    `&response_type=code&scope=identify%20email` +
    `&state=${token}`;
  res.json({ discordAuthUrl });
});

// 카카오 로그인 콜백
router.get('/kakao/callback', async (req, res) => {
  try {
    const code = req.query.code as string; // authorization code
    const jwtTokens = await kakaoCallback(code);

    res.json(jwtTokens); // 프론트에는 전용 JWT만 보냄
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '카카오 로그인 실패' });
  }
});

// 디스코드 연동 콜백
router.get('/discord/callback', async (req, res) => {
  try {
    const code = req.query.code as string;
    const token = req.query.state as string; 

    if (!token) {
      return res.status(400).json({ message: 'Token not found in state' });
    }

    const decoded = verifyAccessToken(token);
    const userId = decoded.id;

    await linkDiscordAccount(code, userId);
    res.json({ message: '디스코드 계정이 성공적으로 연동되었습니다.' });
  } catch (err: any) {
    console.error(err);
    if (err.message.includes('EXPIRED')) {
      return res.status(401).json({ message: '연동 세션이 만료되었습니다. 다시 시도해주세요.' });
    }
    res.status(500).json({ error: '디스코드 연동 실패', message: err.message });
  }
});

// refresh 토큰을 받아서 새로운 acess, refresh 토큰 발급
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'RefreshToken 필요' });
  }
  try {
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens(payload);
    res.json(tokens);
  } catch (err: any) {
    if (err.message.includes('EXPIRED'))
      return res.status(401).json({ message: 'RefreshToken 만료' });
    return res.status(403).json({ message: '유효하지 않은 RefreshToken' });
  }
});
export default router;
