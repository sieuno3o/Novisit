// 로그인 관련 엔드포인트 파일

import { Router } from 'express'
import { kakaoCallback } from '../auth/kakao'
import { discordCallback } from '../auth/discord'
import { verifyRefreshToken, generateTokens } from '../auth/jwt'
const router = Router()

// 카카오 로그인 프론트에서 이 주소로 이동시킴
router.get('/kakao/login', (req, res) => {
  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?client_id=${process.env.KAKAO_CLIENT_ID}` +
    `&redirect_uri=${process.env.KAKAO_REDIRECT_URI}` +
    `&response_type=code` +
    `&scope=profile_nickname,account_email,talk_message`;
  res.redirect(kakaoAuthUrl);
});

router.get('/discord/login', (req, res) => {
  const discordAuthUrl =
    `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}` +
    `&response_type=code&scope=identify%20email`;
  res.redirect(discordAuthUrl);
});

// 카카오 로그인 콜백
router.get('/kakao/callback', async (req, res) => {
  try {
    const code = req.query.code as string // authorization code 
    const jwtTokens = await kakaoCallback(code)
    res.json(jwtTokens) // 프론트에는 전용 JWT만 보냄
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '카카오 로그인 실패' })
  }
})

// 디스코드 로그인 콜백
router.get('/discord/callback', async (req, res) => {
  try {
    const code = req.query.code as string
    const jwtTokens = await discordCallback(code)
    res.json(jwtTokens)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '디스코드 로그인 실패' })
  }
})

// refresh 토큰을 받아서 새로운 acess, refresh 토큰 발급
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(400).json({ message: 'RefreshToken 필요' })
  } 
  try {
    const payload = verifyRefreshToken(refreshToken)
    const tokens = generateTokens(payload)
    res.json(tokens)
  } catch (err: any) {
    if (err.message.includes('EXPIRED')) return res.status(401).json({ message: 'RefreshToken 만료' })
    return res.status(403).json({ message: '유효하지 않은 RefreshToken' })
  }
})
export default router
