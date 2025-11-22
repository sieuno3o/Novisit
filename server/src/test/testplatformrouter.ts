import { routeMessageByPlatform } from "../services/platformRouter";

console.log("NODE_ENV =", process.env.NODE_ENV);

async function test() {
  const fakeSetting = {
    user_id: "user_id",
    channel: ["kakao", "discord"],
    name: "테스트 설정"
  };

  await routeMessageByPlatform(
    fakeSetting,
    "테스트 제목",
    "테스트 내용",
    "https://naver.com",
    "https://cdn.pixabay.com/photo/2025/11/06/10/18/flying-9940383_1280.jpg"
  );

  console.log("📨 테스트 완료");
}

test().catch(console.error);