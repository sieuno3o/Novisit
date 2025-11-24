import { messaging } from "./firebaseConfig"; 
import { getToken, deleteToken } from "firebase/messaging";
import http from "../api/http";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// 브라우저가 푸시 알림을 지원하는지 확인
function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator
  );
}

/**
 * 1) 브라우저에 알림 권한 요청
 * 2) firebase-messaging-sw.js 서비스워커 등록
 * 3) FCM 토큰 발급해서 문자열로 반환
 */
export async function getFcmTokenFromBrowser(): Promise<string> {
  if (!isPushSupported()) {
    throw new Error("이 브라우저에서는 푸시 알림을 사용할 수 없습니다.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 허용되지 않았습니다.");
  }

  // FCM용 서비스워커 등록
  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  if (!messaging) {
    throw new Error("Firebase messaging이 초기화되지 않았습니다.");
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("FCM 토큰을 가져오지 못했습니다.");
  }

  return token;
}

// 서버에 FCM 토큰 저장 요청(JWT 필요)
export async function saveFcmTokenToServer(token: string): Promise<void> {
  await http.post("/api/users/fcm-token", {
    fcmToken: token,
  });
}


// 서버에서 FCM 토큰 삭제 요청
export async function deleteFcmTokenFromServer(): Promise<void> {
  await http.delete("/api/users/fcm-token");
}

/**
 * 푸시 알림 ON:
 * 1) 브라우저에서 FCM 토큰 발급
 * 2) 서버에 토큰 저장
 */
export async function enablePushForCurrentUser(): Promise<void> {
  const token = await getFcmTokenFromBrowser();
  await saveFcmTokenToServer(token);
  // console.log(token)
}

/**
 * 푸시 알림 OFF:
 * 1) 서버에서 토큰 삭제
 * 2) (선택) 클라이언트 FCM 토큰도 삭제
 */
export async function disablePushForCurrentUser(): Promise<void> {
  await deleteFcmTokenFromServer();

  if (!messaging) return;

  try {
    await deleteToken(messaging);
  } catch (err) {
    // 서버에서만 끄고 클라이언트 토큰은 남아 있어도 큰 문제는 없어서 경고만
    console.warn("클라이언트 FCM 토큰 삭제 실패 (무시 가능):", err);
  }
}
