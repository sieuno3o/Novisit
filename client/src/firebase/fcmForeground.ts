import { onMessage } from "firebase/messaging";
import { messaging } from "./firebaseConfig";
import { useToast } from "../components/Toast";

export function subscribeForegroundMessages(callback: (payload: any) => void) {
  if (!messaging) return;

  const toast = useToast();
  // onMessage는 탭이 포그라운드 상태일 때만 작동
  onMessage(messaging, (payload) => {
    console.log("[FCM] 포그라운드 메시지 수신:", payload);
    toast.show(payload.notification?.title ?? "새 알림이 도착했습니다.");
    callback(payload);
  });
}
