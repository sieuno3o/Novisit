import { User } from "../models/User.js";
import { sendKakaoMessage } from "./notificationService.js";
import { notifyDiscord } from "./discordNotifier.js";
import { sendFCMNotification } from "./fcmService.js"; // FCM 서비스 임포트

export async function routeMessageByPlatform(
  setting: any,
  title: string,
  description: string,
  linkUrl: string,
  imageUrl: string
) {
  if (!setting.channel || !Array.isArray(setting.channel)) return;

  // Send to Discord if enabled
  if (setting.channel.includes("discord")) {
    await notifyDiscord(setting.user_id, title, description, linkUrl, imageUrl);
  }

  // Send to Kakao if enabled
  if (setting.channel.includes("kakao")) {
    await sendKakaoMessage(setting.user_id, title, description, imageUrl, linkUrl);
  }

  // Check for and send FCM push notification
  const user = await User.findById(setting.user_id);
  if (user && user.fcmToken) {
    await sendFCMNotification(setting.user_id, title, description, imageUrl, linkUrl);
  }
}