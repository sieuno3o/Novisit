// src/services/discordNotifier.ts
import { initDiscordBot, sendDiscordMessage } from "./discordService";

export async function notifyDiscord(userId: string, title: string,  description: string,  linkUrl: string,  imageUrl?: string) {
  try {
    // 디스코드 봇 로그인 (이미 로그인된 경우 바로 resolve)
    await initDiscordBot();

    // 사용자에게 DM 발송
    await sendDiscordMessage(userId, title, description, linkUrl, imageUrl);

    console.log(`📨 notifyDiscord: 사용자(${userId})에게 디스코드 알림 전송 완료`);
  } catch (error: any) {
    console.error(`❌ notifyDiscord 오류 (userId: ${userId}):`, error.message);
    throw error;
  }
}
