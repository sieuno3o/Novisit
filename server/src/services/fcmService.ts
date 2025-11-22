// server/src/services/fcmService.ts
import admin from 'firebase-admin';
import { User } from '../models/User.js'; // User 모델을 사용하기 위해 임포트

export async function sendFCMNotification(
  userId: string,
  title: string,
  body: string,
  imageUrl?: string,
  linkUrl?: string
): Promise<void> {
  try {
    const user = await User.findById(userId);
    if (!user || !user.fcmToken) {
      console.log(`FCM 토큰이 없거나 사용자를 찾을 수 없습니다: ${userId}`);
      return;
    }

    const notificationPayload: admin.messaging.Notification = {
      title: title,
      body: body,
    };

    if (imageUrl) {
      notificationPayload.imageUrl = imageUrl;
    }

    const message: admin.messaging.Message = {
      notification: notificationPayload,
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          icon: 'https://your-app-domain.com/favicon.ico', // 앱 아이콘 URL (프론트엔드에서 설정)
          badge: 'https://your-app-domain.com/badge.png', // 뱃지 아이콘 URL (선택 사항)
          click_action: linkUrl || 'https://your-app-domain.com', // 알림 클릭 시 이동할 URL
        },
      },
      token: user.fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`FCM 푸시 알림 성공적으로 전송: ${userId}`);
  } catch (error) {
    console.error(`FCM 푸시 알림 전송 실패 (user: ${userId}):`, error);
    // 토큰이 유효하지 않은 경우 DB에서 삭제하는 로직 추가 고려
    // if (error.code === 'messaging/invalid-registration-token' || error.code === 'messaging/registration-token-not-registered') {
    //   await User.findByIdAndUpdate(userId, { fcmToken: null }); // 예시: 토큰 삭제
    // }
    throw error;
  }
}
