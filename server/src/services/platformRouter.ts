import { sendKakaoMessage } from "./notificationService.js";
import { notifyDiscord } from "./discordNotifier.js";

export async function routeMessageByPlatform(
  setting: any,
  title: string,
  description: string,
  linkUrl: string,
  imageUrl: string
) {

  if (!setting.channel || !Array.isArray(setting.channel)) return;

  if (setting.channel.includes("discord")) {
    await notifyDiscord(setting.user_id, title, description, linkUrl, imageUrl);
  }

  if (setting.channel.includes("kakao")) {
    await sendKakaoMessage(setting.user_id, title, description, imageUrl, linkUrl);
  }
}