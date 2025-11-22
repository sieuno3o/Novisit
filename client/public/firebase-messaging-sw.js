console.log("firebase-messaging-sw.js loaded");
//이 파일은 Service Worker이므로 반드시 .js 

// Firebase SDK (compat 버전) 로드
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

// 여기는 .env를 못 쓰기 때문에 직접 하드코딩
firebase.initializeApp({
  apiKey: "AIzaSyA4rxxAqzJHKuOrFxI5XOTYjKoc7hhJhxc",        
  authDomain: "novisit-pwa-push.firebaseapp.com", 
  projectId: "novisit-pwa-push",            
  storageBucket: "novisit-pwa-push.firebasestorage.app", 
  messagingSenderId: "321890384138",      
  appId: "1:321890384138:web:ff2686521e6fb0b290a2f3",                     
});

const messaging = firebase.messaging();

// 1) 브라우저가 닫혀 있거나, 백그라운드에 있을 때 수신되는 메시지 처리
messaging.onBackgroundMessage(function (payload) {
  console.log("[firebase-messaging-sw.js] 백그라운드 메시지 수신:", payload);

  // FCM에서 보낸 기본 notification 필드
  const notification = payload.notification || {};
  const title = notification.title || "새 알림";
  const body = notification.body || "";
  const image = notification.image; // 선택

  // 클릭 시 이동할 URL
  const clickAction =
    (payload.fcmOptions && payload.fcmOptions.link) ||
    (payload.data && payload.data.url) ||
    "/notice"; //일단 알림페이지로 이동

  /** @type {NotificationOptions} */
  const options = {
    body,
    icon: "/assets/img/PWAlogo.png", //  PWA 아이콘 경로
    image: image,
    data: {
      url: clickAction,
    },
  };

  self.registration.showNotification(title, options);
});

//  2) 알림 클릭 시 동작 정의
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  // 이미 열린 탭이 있으면 그 탭을 포커스, 없으면 새 탭 오픈
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // 이미 해당 URL을 보고 있는 탭이 있으면 그 탭 포커스
      const targetClient = allClients.find((client) => {
        return client.url === targetUrl || client.url === self.origin + targetUrl;
      });

      if (targetClient) {
        return targetClient.focus();
      }

      // 없으면 새 창/탭 열기
      return clients.openWindow(targetUrl);
    })()
  );
});
