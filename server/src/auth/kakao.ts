import axios from 'axios'
import { generateTokens } from './jwt'

export async function kakaoCallback(code: string) {
  // 1. Authorization Code → Access Token 교환
  // 카카오 토큰 발급 api에 post 요청
  const tokenResponse = await axios.post(
    'https://kauth.kakao.com/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.KAKAO_CLIENT_ID!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      redirect_uri: process.env.KAKAO_REDIRECT_URI!,
      code,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const accessToken = tokenResponse.data.access_token

  // 2. 사용자 정보 조회
  const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const kakaoUser = userResponse.data

  const payload = {
    id: String(kakaoUser.id),
    name: kakaoUser.kakao_account.profile.nickname,
    email: kakaoUser.kakao_account.email,
  }

  // 3. 자체 JWT 발급
  return generateTokens(payload)
}
