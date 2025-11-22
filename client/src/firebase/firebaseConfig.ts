// Firebase SDK 초기화

import { initializeApp } from "firebase/app";
import { getMessaging, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env
    .VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Firebase 앱 초기화
export const app = initializeApp(firebaseConfig);

// messaging 객체 생성
// (브라우저 환경에서만 정상 동작하므로 try/catch 방어로직 포함)
let messaging: Messaging | null = null;

try {
  messaging = getMessaging(app);
} catch (err) {
  // ⚠️ 서버환경 또는 브라우저 지원문제 때문에 실패할 수 있어 방어
  console.warn("[가정] Firebase messaging 초기화 실패:", err);
}

export { messaging };
