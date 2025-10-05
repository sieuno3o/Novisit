import axios from 'axios';
import { linkDiscordToUser } from '../services/authService';

export async function linkDiscordAccount(code: string, userId: string) {
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
  );

  const { access_token, refresh_token, expires_in } = tokenResponse.data;

  // 2. 사용자 정보 조회
  const userResponse = await axios.get('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  const discordUser = userResponse.data;

  // 3. UserProfile 형태로 변환
  const userProfile = {
    id: String(discordUser.id),
    name: discordUser.username,
    email: discordUser.email,
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
  };

  // 4. DB에서 사용자 찾아서 디스코드 계정 연동
  const user = await linkDiscordToUser(userId, userProfile);

  return user;
}



