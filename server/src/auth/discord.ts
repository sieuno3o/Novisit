import axios from 'axios'
import { generateTokens } from './jwt'

export async function discordCallback(code: string) {
  // 1. Authorization Code → Access Token 교환
  const tokenResponse = await axios.post(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      code,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  const accessToken = tokenResponse.data.access_token

  // 2. 사용자 정보 조회
  const userResponse = await axios.get('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const discordUser = userResponse.data

  const payload = {
    id: String(discordUser.id),
    name: discordUser.username,
    email: discordUser.email, 
  }

  // 3. 자체 JWT 발급
  return generateTokens(payload)
}
