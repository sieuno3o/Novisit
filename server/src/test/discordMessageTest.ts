// src/test/discordMessageTest.ts
import { Router } from "express";
import { notifyDiscord } from "../services/discordNotifier.js";

const router = Router();

/**
 * 디스코드 DM 테스트용 엔드포인트
 * - BullMQ, 크롤링 스케줄러 등을 거치지 않고 직접 테스트
 * - userId만 있으면 테스트 가능
 */
router.post("/discord", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId가 요청 본문에 없습니다." });
  }

  // 테스트용 메시지 (원하면 수정 가능)
  const testMessage = "📢 [테스트] 디스코드 알림 메시지가 정상적으로 도착했습니다.";

  try {
    await notifyDiscord(userId, testMessage);

    return res.status(200).json({
      message: "디스코드 메시지를 성공적으로 보냈습니다.",
    });
  } catch (error: any) {
    console.error("디스코드 DM 전송 실패:", error.message);

    return res.status(500).json({
      message: "디스코드 메시지 전송에 실패했습니다.",
      error: error.message,
    });
  }
});

export default router;